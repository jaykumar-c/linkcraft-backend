import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../modules/auth/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { User } from './entities/user.entity';

/**
 * Controller handling user profile-related HTTP endpoints.
 * All routes require JWT authentication.
 */
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Retrieves the authenticated user's profile.
   *
   * @param user - The authenticated user injected via CurrentUser decorator
   * @returns Promise with message, errorCode, and profile data
   */
  @Get('profile')
  @HttpCode(HttpStatus.OK)
  async getProfile(@CurrentUser() user: User) {
    const result = await this.usersService.getProfile(user.id);
    return {
      message: 'Profile fetched successfully',
      errorCode: 'USER001',
      data: result,
    };
  }

  /**
   * Updates the authenticated user's profile.
   * Performs a partial update - only provided fields will be updated.
   *
   * @param user - The authenticated user injected via CurrentUser decorator
   * @param updateProfileDto - The profile data to update
   * @returns Promise with message and errorCode only (no data)
   */
  @Patch('profile')
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @CurrentUser() user: User,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    await this.usersService.updateProfile(user.id, updateProfileDto);
    return {
      message: 'Profile updated successfully',
      errorCode: 'USER002',
      data: null,
    };
  }
}
