import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import { JwtAuthGuard, JwtRefreshGuard } from "../../common/guards";
import { CurrentUser } from "./decorators/current-user.decorator";
import { User } from "../users/entities/user.entity";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { LogoutDto } from "./dto/logout.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() body: RegisterDto) {
    const result = await this.authService.register(body);
    return {
      message: "Registered successfully",
      errorCode: "ACR001",
      data: result,
      error: "",
    };
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: LoginDto, @Request() req: any) {
    const result = await this.authService.loginWithPassword(
      body.email,
      body.password,
      req,
    );
    return {
      message: "Login successfully",
      errorCode: "ACR002",
      data: result,
      error: "",
    };
  }

  @UseGuards(JwtRefreshGuard)
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  async refresh(@Request() req: any) {
    const refreshToken = req.refreshToken;
    const result = await this.authService.refreshTokens(refreshToken, req);
    return {
      message: "Token refreshed successfully",
      errorCode: "ACR003",
      data: result,
      error: "",
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post("logout")
  @HttpCode(HttpStatus.OK)
  async logout(@Body() body: LogoutDto) {
    await this.authService.logout(body.refreshToken);
    return {
      message: "Logout successfully",
      errorCode: "ACR004",
      data: {},
      error: "",
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post("logout/all")
  @HttpCode(HttpStatus.OK)
  async logoutAll(@CurrentUser() user: any) {
    await this.authService.logoutAll(user.id, user.deviceId);
    return {
      message: "All other sessions logged out successfully",
      errorCode: "ACR005",
      data: {},
      error: "",
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get("sessions")
  @HttpCode(HttpStatus.OK)
  async getSessions(@CurrentUser() user: User) {
    const sessions = await this.authService.getSessions(user.id);
    return {
      message: "",
      errorCode: "ACR008",
      data: sessions,
      error: "",
    };
  }

  @Post("forgot-password")
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    await this.authService.forgotPassword(body.email);
    return {
      message: "Password reset email sent",
      errorCode: "ACR006",
      data: {},
      error: "",
    };
  }

  @Post("reset-password")
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() body: ResetPasswordDto) {
    await this.authService.resetPassword(body.token, body.newPassword);
    return {
      message: "Password reset successfully",
      errorCode: "ACR007",
      data: {},
      error: "",
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post("change-password")
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Body() body: ChangePasswordDto,
    @CurrentUser() user: User,
  ) {
    await this.authService.changePassword(
      user.id,
      body.currentPassword,
      body.newPassword,
    );
    return {
      message: "Password changed successfully.",
      errorCode: "ACR021",
      data: {},
      error: "",
    };
  }

  @Get("check-username")
  @HttpCode(HttpStatus.OK)
  async checkUsername(@Query("username") username: string) {
    const result = await this.authService.checkUsernameAvailability(username);
    return {
      message: "",
      errorCode: "ACR020",
      data: result,
      error: "",
    };
  }
}
