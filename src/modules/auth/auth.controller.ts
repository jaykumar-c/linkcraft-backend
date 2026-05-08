import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() body: RegisterDto) {
    const result = await this.authService.register(body);
    return {
      message: 'Registered successfully',
      errorCode: 'AUS001',
      data: result,
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: LoginDto, @Request() req: any) {
    const result = await this.authService.loginWithPassword(
      body.email,
      body.password,
      req,
    );
    return {
      message: 'Login successfully',
      errorCode: 'AUTH_LOGIN_SUCCESS',
      data: result,
    };
  }

  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Request() req: any) {
    const refreshToken = req.refreshToken;
    const result = await this.authService.refreshTokens(refreshToken, req);
    return {
      message: 'Token refreshed successfully',
      errorCode: 'AUTH_REFRESH_SUCCESS',
      data: result,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Body() body: LogoutDto) {
    await this.authService.logout(body.refreshToken);
    return { message: 'Logout Successfully', errorCode: 'AUTH006', data: null };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  async logoutAll(@CurrentUser() user: User) {
    await this.authService.logoutAll(user.id);
    return {
      message: 'Logout all sessions successfully',
      errorCode: 'AUTH007',
      data: null,
    };
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    await this.authService.forgotPassword(body.email);
    return {
      message: 'Password reset email sent (if account exists)',
      errorCode: 'AUTH011',
      data: null,
    };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() body: ResetPasswordDto) {
    await this.authService.resetPassword(body.token, body.newPassword);
    return {
      message: 'Password reset successfully',
      errorCode: 'AUTH012',
      data: null,
    };
  }
}
