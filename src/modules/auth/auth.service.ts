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
import { REGEX, VALIDATION_MESSAGES } from "../../common/helpers/regex.helper";
import { MailService } from "../mail/mail.service";
import { MAIL_EVENTS } from "../mail/constants/mail-events.constants";
import { generateTokens } from "./helpers/token.helper";
import { RegisterDto } from "./dto/register.dto";

const PASSWORD_MIN_LENGTH = 8;
const RESET_TOKEN_EXPIRY_HOURS = 1;

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

    const existingEmail = await this.userRepository.findOne({
      where: { email, isDeleted: false },
    });
    if (existingEmail) {
      throw new BadRequestException({
        errorCode: "ACR009",
        message: "Email is already registered.",
      });
    }

    const existingUsername = await this.userRepository.findOne({
      where: { username },
    });
    if (existingUsername) {
      throw new BadRequestException({
        errorCode: "ACR010",
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
        errorCode: "ACR011",
        message: "Invalid email or password.",
      });
    }

    const isValid = await argon2.verify(user.passwordHash, password);
    if (!isValid) {
      throw new UnauthorizedException({
        errorCode: "ACR011",
        message: "Invalid email or password.",
      });
    }

    return this.login(user, req);
  }

  async login(user: User, req: any) {
    if (user.isDeleted || !user.isActive) {
      throw new UnauthorizedException({
        errorCode: "ACR012",
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
        errorCode: "ACR013",
        message: "Refresh token is invalid or expired.",
      });
    }

    const user = await this.userRepository.findOne({
      where: { id: existingToken.userId },
    });
    if (!user || user.isDeleted || !user.isActive) {
      throw new UnauthorizedException({
        errorCode: "ACR012",
        message: "Account is disabled or deleted.",
      });
    }

    await this.deviceRepository.delete(existingToken.id);

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

    return { message: "Logout Successfully", errorCode: "ACR004" };
  }

  async logoutAll(userId: string, currentDeviceId?: string) {
    if (currentDeviceId) {
      await this.deviceRepository
        .createQueryBuilder()
        .delete()
        .from("devices")
        .where("user_id = :userId", { userId })
        .andWhere("id != :currentDeviceId", { currentDeviceId })
        .execute();
    } else {
      await this.deviceRepository
        .createQueryBuilder()
        .delete()
        .from("devices")
        .where("user_id = :userId", { userId })
        .execute();
    }
  }

  async getSessions(userId: string) {
    const devices = await this.deviceRepository.find({
      where: { userId, isDeleted: false },
      order: { lastUsedAt: "DESC" },
      select: ["id", "deviceInfo", "lastUsedAt", "createdAt"],
    });

    return devices.map((device) => ({
      id: device.id,
      deviceInfo: device.deviceInfo || "Unknown device",
      lastUsedAt: device.lastUsedAt,
      createdAt: device.createdAt,
    }));
  }

  async checkUsernameAvailability(username: string): Promise<{ available: boolean; message: string }> {
    if (!username || typeof username !== 'string' || username.trim().length < 3) {
      return {
        available: false,
        message: VALIDATION_MESSAGES.USERNAME.MIN_LENGTH,
      };
    }

    if (!REGEX.USERNAME.test(username)) {
      return {
        available: false,
        message: VALIDATION_MESSAGES.USERNAME.INVALID_FORMAT,
      };
    }

    const existingUser = await this.userRepository.findOne({
      where: { username: username.toLowerCase() },
      select: ['id'],
    });

    if (existingUser) {
      return {
        available: false,
        message: 'Username is already taken',
      };
    }

    return {
      available: true,
      message: 'Username is available',
    };
  }

  async forgotPassword(email: string) {
    if (!email || typeof email !== "string") {
      throw new BadRequestException({
        errorCode: "VAL001",
        message: "Email is required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.userRepository.findOne({
      where: { email: normalizedEmail, isDeleted: false },
    });

    if (!user) {
      return;
    }

    if (!user.isActive) {
      throw new BadRequestException({
        errorCode: "ACR014",
        message: "Account is disabled. Cannot reset password.",
      });
    }

    if (
      user.passwordResetExpiresAt &&
      user.passwordResetExpiresAt > getCurrentTimestampSeconds()
    ) {
      throw new BadRequestException({
        errorCode: "ACR015",
        message: "A reset email has already been sent. Please wait before requesting again.",
      });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const expiresAt = getCurrentTimestampSeconds() + RESET_TOKEN_EXPIRY_HOURS * 60 * 60;

    await this.userRepository.query(
      `UPDATE users SET password_reset_token = $1, password_reset_expires_at = $2 
       WHERE id = $3`,
      [hashedToken, expiresAt, user.id],
    );

    const baseUrl = this.configService.get<string>("USER_BASE_URL") || "http://localhost:5173";
    const resetLink = `${baseUrl}/reset-password?token=${token}`;

    this.mailService
      .sendEmail(MAIL_EVENTS.PASSWORD_RESET, email, {
        name: user?.displayName || user?.username || "User",
        resetLink,
      })
      .catch((error) => {
        console.error("Failed to send password reset email:", error);
      });
  }

  async resetPassword(token: string, newPassword: string) {
    if (!token || typeof token !== "string") {
      throw new BadRequestException({
        errorCode: "VAL001",
        message: "Token is required",
      });
    }

    if (!newPassword || typeof newPassword !== "string") {
      throw new BadRequestException({
        errorCode: "VAL001",
        message: "New password is required",
      });
    }

    if (newPassword.length < PASSWORD_MIN_LENGTH) {
      throw new BadRequestException({
        errorCode: "VAL001",
        message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
      });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    
    const rows = await this.userRepository.query(
      `SELECT id, password_hash, password_reset_expires_at 
       FROM users 
       WHERE password_reset_token = $1 AND is_deleted = false`,
      [hashedToken],
    );

    if (!rows || rows.length === 0) {
      throw new BadRequestException({
        errorCode: "ACR016",
        message: "Invalid reset token.",
      });
    }

    const userData = rows[0];
    const expiresAt = parseInt(userData.password_reset_expires_at, 10);

    if (!expiresAt || expiresAt < getCurrentTimestampSeconds()) {
      await this.userRepository.query(
        `UPDATE users SET password_reset_token = NULL, password_reset_expires_at = NULL 
         WHERE id = $1`,
        [userData.id],
      );

      throw new BadRequestException({
        errorCode: "ACR017",
        message: "Reset token has expired. Please request a new one.",
      });
    }

    const passwordHash = userData.password_hash;
    if (!passwordHash) {
      throw new BadRequestException({
        errorCode: "ACR019",
        message: "Password reset not available for this account.",
      });
    }

    const isSamePassword = await argon2.verify(passwordHash, newPassword);
    if (isSamePassword) {
      throw new BadRequestException({
        errorCode: "ACR018",
        message: "New password cannot be the same as your current password.",
      });
    }

    const newHash = await argon2.hash(newPassword);
    await this.userRepository.query(
      `UPDATE users SET password_hash = $1, password_reset_token = NULL, 
       password_reset_expires_at = NULL, updated_at = $2 WHERE id = $3`,
      [newHash, getCurrentTimestampSeconds(), userData.id],
    );

    await this.logoutAll(userData.id);
  }
}