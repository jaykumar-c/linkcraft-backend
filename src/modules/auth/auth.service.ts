import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as argon2 from "argon2";
import * as crypto from "crypto";

import { User } from "../users/entities/user.entity";
import { Device } from "./entities/device.entity";
import { getCurrentTimestampSeconds } from "../../common/helpers/date.helper";
import { MailService } from "../mail/mail.service";
import { MAIL_EVENTS } from "../mail/constants/mail-events.constants";
import { generateTokens } from "./helpers/token.helper";
import { RegisterDto } from "./dto/register.dto";

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(Device) private deviceRepository: Repository<Device>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private mailService: MailService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { email, password, username, displayName } = registerDto;

    // Check duplicate email
    const existingEmail = await this.userRepository.findOne({
      where: { email, isDeleted: false },
    });
    if (existingEmail) {
      throw new BadRequestException({
        errorCode: "AUTH001",
        message: "Email is already registered.",
      });
    }

    // Check duplicate username
    const existingUsername = await this.userRepository.findOne({
      where: { username },
    });
    if (existingUsername) {
      throw new BadRequestException({
        errorCode: "AUTH002",
        message: "Username is already taken.",
      });
    }

    const passwordHash = await argon2.hash(password);

    const user = this.userRepository.create({
      email,
      username,
      displayName,
      passwordHash,
    });

    // Welcome email is best-effort; registration must not fail if mail fails.
    this.mailService
      .sendEmail(MAIL_EVENTS.WELCOME, email, { name: displayName || username })
      .catch((error) => console.error("Failed to send welcome email:", error));

    await this.userRepository.save(user);

    const tokens = await generateTokens(
      user,
      this.jwtService,
      this.configService,
      this.deviceRepository,
    );
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        username: user.username,
      },
    };
  }

  async loginWithPassword(email: string, password: string, req: any) {
    const normalizedEmail = email.trim().toLowerCase();
    const rows = await this.userRepository.query(
      `
      SELECT
        u.id,
        u.email,
        u.username,
        u.password_hash AS "passwordHash",
        u.is_active AS "isActive",
        u.is_deleted AS "isDeleted"
      FROM users u
      WHERE LOWER(u.email) = $1
      LIMIT 1
      `,
      [normalizedEmail],
    );

    const user = (rows?.[0] ?? null) as User | null;
    if (!user?.passwordHash) {
      throw new UnauthorizedException({
        errorCode: "AUTH003",
        message: "Invalid email or password.",
      });
    }

    const isValid = await argon2.verify(user.passwordHash, password);
    if (!isValid) {
      throw new UnauthorizedException({
        errorCode: "AUTH003",
        message: "Invalid email or password.",
      });
    }

    return this.login(user, req);
  }

  async login(user: User, req: any) {
    if (user.isDeleted || !user.isActive) {
      throw new UnauthorizedException({
        errorCode: "AUTH005",
        message: "Account is disabled or deleted.",
      });
    }

    user.lastLoginAt = getCurrentTimestampSeconds();
    await this.userRepository.save(user);

    const tokens = await generateTokens(
      user,
      this.jwtService,
      this.configService,
      this.deviceRepository,
      req?.headers["user-agent"],
      req?.ip,
    );
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        username: user.username,
      },
    };
  }

  async refreshTokens(rawRefreshToken: string, req: any) {
    const existingToken = await this.deviceRepository.findOne({
      where: { refreshToken: rawRefreshToken },
    });

    if (
      !existingToken ||
      existingToken.expiresAt < getCurrentTimestampSeconds()
    ) {
      throw new UnauthorizedException({
        errorCode: "AUTH014",
        message: "Refresh token is invalid or expired.",
      });
    }

    const user = await this.userRepository.findOne({
      where: { id: existingToken.userId },
    });
    if (!user || user.isDeleted || !user.isActive) {
      throw new UnauthorizedException({
        errorCode: "AUTH005",
        message: "Account is disabled or deleted.",
      });
    }

    // Delete old token
    await this.deviceRepository.delete(existingToken.id);

    // Issue new ones
    return generateTokens(
      user,
      this.jwtService,
      this.configService,
      this.deviceRepository,
      req?.headers["user-agent"],
      req?.ip,
    );
  }

  async logout(rawRefreshToken: string) {
    const existingToken = await this.deviceRepository.findOne({
      where: { refreshToken: rawRefreshToken },
    });
    if (existingToken) {
      await this.deviceRepository.remove(existingToken);
    }

    return { message: "Logout Successfully", errorCode: "AUTH006" };
  }

  async logoutAll(userId: string) {
    await this.deviceRepository.delete({ userId });
  }

  async forgotPassword(email: string) {
    const user = await this.userRepository.findOne({ where: { email } });
    if (user) {
      const token = crypto.randomBytes(32).toString("hex");
      const hashedToken = crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

      user.passwordResetToken = hashedToken;
      user.passwordResetExpiresAt = getCurrentTimestampSeconds() + 60 * 60; // 1 hour
      await this.userRepository.save(user);

      this.mailService
        .sendEmail(MAIL_EVENTS.PASSWORD_RESET, email, {
          name: user?.displayName || user?.username || "User",
          otp: token,
        })
        .catch((error) => {
          console.error("Failed to send password reset email:", error);
        }); // Fire and forget
    }
  }

  async resetPassword(token: string, newPassword: string) {
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const user = await this.userRepository.findOne({
      where: { passwordResetToken: hashedToken },
    });

    if (
      !user ||
      !user.passwordResetExpiresAt ||
      user.passwordResetExpiresAt < getCurrentTimestampSeconds()
    ) {
      throw new BadRequestException({
        errorCode: "AUTH013",
        message: "Token is invalid or expired.",
      });
    }

    user.passwordHash = await argon2.hash(newPassword);
    user.passwordResetToken = null;
    user.passwordResetExpiresAt = null;
    await this.userRepository.save(user);

    // Invalidate all refresh tokens
    await this.logoutAll(user.id);
  }
}
