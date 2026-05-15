import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from "@nestjs/common";
import * as argon2 from "argon2";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { AdminGuard } from "./guards/admin.guard";
import { User } from "../users/entities/user.entity";
import { Device } from "../auth/entities/device.entity";
import { generateTokens } from "../auth/helpers/token.helper";
import { AdminLoginDto } from "./dto/admin-login.dto";
import { ForbiddenException, UnauthorizedException } from "@nestjs/common";

@Controller("admin/auth")
export class AdminAuthController {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Device)
    private readonly deviceRepository: Repository<Device>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: AdminLoginDto, @Req() req: any) {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const rows = await this.userRepository.query(
      `
      SELECT
        u.id,
        u.email,
        u.username,
        u.role,
        u.plan,
        u.password_hash AS "passwordHash",
        u.is_active AS "isActive",
        u.is_deleted AS "isDeleted"
      FROM users u
      WHERE LOWER(u.email) = $1
      LIMIT 1
      `,
      [normalizedEmail],
    );

    const user = rows?.[0] ?? null;
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException({
        errorCode: "ADM004",
        message: "Invalid admin credentials.",
      });
    }

    if (user.role !== "admin") {
      throw new ForbiddenException({
        errorCode: "ADM001",
        message: "Admin access required.",
      });
    }

    if (user.isDeleted || !user.isActive) {
      throw new UnauthorizedException({
        errorCode: "ACR012",
        message: "Account is disabled or deleted.",
      });
    }

    const isValid = await argon2.verify(user.passwordHash, dto.password);
    if (!isValid) {
      throw new UnauthorizedException({
        errorCode: "ADM004",
        message: "Invalid admin credentials.",
      });
    }

    const tokens = await generateTokens(
      user,
      this.jwtService,
      this.configService,
      this.deviceRepository,
      req?.ip,
    );

    return {
      message: "Admin login successful",
      errorCode: "ADMS001",
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
        },
      },
      error: "",
    };
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post("logout")
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: any) {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(" ")?.[1];

    const device = await this.deviceRepository.findOne({
      where: { accessToken: token },
    });

    if (device) {
      await this.deviceRepository.remove(device);
    }

    return {
      message: "Admin logout successful",
      errorCode: "ADMS002",
      data: {},
      error: "",
    };
  }
}
