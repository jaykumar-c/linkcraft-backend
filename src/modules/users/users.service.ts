import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as argon2 from 'argon2';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { User } from './entities/user.entity';
import { updateOnlyDefinedFields } from 'src/common/helpers/update-defined-field.helper';

/**
 * Service responsible for user profile operations.
 * Uses raw SQL queries for optimal performance and direct database control.
 */
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Retrieves the current user's profile by ID.
   * Excludes sensitive fields like password_hash, reset tokens, and OAuth IDs.
   *
   * @param userId - The UUID of the user to retrieve
   * @returns Promise<User> - The user entity without sensitive data
   * @throws NotFoundException - If user is not found or is deleted
   */
  async getProfile(userId: string): Promise<Partial<User>> {
    const user = await this.userRepository.findOne({
      where: { id: userId, isDeleted: false },
      select: [
        'id',
        'email',
        'username',
        'displayName',
        'avatarUrl',
        'bioText',
        'profession',
        'themeSettings',
        'plan',
        'totalProfileViews',
        'totalAiTokensUsed',
        'lastLoginAt',
        'createdAt',
        'updatedAt',
        'isActive'
      ]
    });

    if (!user) {
      this.logger.warn(`User not found: ${userId}`);
      throw new NotFoundException({
        errorCode: 'USER001',
        message: 'User not found',
      });
    }

    return user;
  }

  /**
   * Updates the current user's profile with the provided data.
   * Only updates fields that are explicitly provided (partial update).
   *
   * @param userId - The UUID of the user to update
   * @param updateData - The profile data to update
   * @returns Promise<Partial<User>> - The updated user profile
   * @throws NotFoundException - If user is not found or is deleted
   */
  async updateProfile(
    userId: string,
    updateData: UpdateProfileDto,
  ): Promise<Partial<User>> {
    // Find the user first
    const user = await this.userRepository.findOne({
      where: { id: userId, isDeleted: false },
    });

    if (!user) {
      this.logger.warn(`User not found for update: ${userId}`);
      throw new NotFoundException({
        errorCode: 'USER001',
        message: 'User not found',
      });
    }

    // Define the fields we want to check for updates (matching DTO and entity field names)
    const fieldsToCheck = {
      displayName: updateData.displayName,
      username: updateData.username,
      bioText: updateData.bioText,
      bio: (updateData as any).bio, // Handle both bioText and bio fields from DTO
      profession: updateData.profession,
      avatarUrl: updateData.avatar_url, // Note: DTO uses avatar_url, entity uses avatarUrl
    };

    // Use helper to get only defined fields
    const definedFields = updateOnlyDefinedFields(fieldsToCheck);

    // Handle bio field mapping (both bioText and bio from DTO map to bioText in entity)
    if (definedFields.bio !== undefined && definedFields.bioText === undefined) {
      definedFields.bioText = definedFields.bio;
    }

    // Update only the defined fields
    Object.assign(user, {
      displayName: definedFields.displayName ?? user.displayName,
      username: definedFields.username ?? user.username,
      bioText: definedFields.bioText ?? user.bioText,
      profession: definedFields.profession ?? user.profession,
      avatarUrl: definedFields.avatarUrl ?? user.avatarUrl,
    });

    // Always update the updatedAt timestamp
    user.updatedAt = Math.floor(Date.now() / 1000);

    // Save the updated user
    const updatedUser = await this.userRepository.save(user);

    // Return the user without sensitive fields
    const {
      passwordHash,
      googleId,
      githubId,
      passwordResetToken,
      passwordResetExpiresAt,
      ...userWithoutSensitiveData
    } = updatedUser;

    return userWithoutSensitiveData;
  }

  async incrementTokenUsage(userId: string, tokensUsed: number): Promise<void> {
    await this.userRepository
      .createQueryBuilder()
      .update(User)
      .set({ 
        totalAiTokensUsed: () => `total_ai_tokens_used + ${tokensUsed}`,
        updatedAt: Math.floor(Date.now() / 1000)
      })
      .where("id = :userId", { userId })
      .andWhere("isDeleted = false")
      .execute();
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto): Promise<void> {
    if (!userId) {
      throw new NotFoundException({
        errorCode: 'UCP005',
        message: 'User not found',
      });
    }

    const user = await this.userRepository.findOne({
      where: { id: userId, isDeleted: false },
      select: ['id', 'passwordHash', 'isActive', 'isDeleted']
    });

    if (!user) {
      throw new NotFoundException({
        errorCode: 'UCP005',
        message: 'User not found',
      });
    }

    if (!user.isActive) {
      throw new BadRequestException({
        errorCode: 'UCP006',
        message: 'Account is disabled',
      });
    }

    if (!changePasswordDto.currentPassword) {
      throw new BadRequestException({
        errorCode: 'VAL001',
        message: 'Current password is required',
      });
    }

    if (!changePasswordDto.newPassword) {
      throw new BadRequestException({
        errorCode: 'VAL001',
        message: 'New password is required',
      });
    }

    if (changePasswordDto.newPassword.length < 8) {
      throw new BadRequestException({
        errorCode: 'VAL001',
        message: 'Password must be at least 8 characters',
      });
    }

    if (changePasswordDto.currentPassword === changePasswordDto.newPassword) {
      throw new BadRequestException({
        errorCode: 'UCP007',
        message: 'New password cannot be the same as current password',
      });
    }

    // If passwordHash is null, it's an OAuth-only account and cannot use password authentication
    if (!user.passwordHash) {
      throw new BadRequestException({
        errorCode: 'UCP008',
        message: 'Current password is incorrect',
      });
    }

    const isValid = await argon2.verify(user.passwordHash, changePasswordDto.currentPassword);
    if (!isValid) {
      throw new BadRequestException({
        errorCode: 'UCP008',
        message: 'Current password is incorrect',
      });
    }

    const newPasswordHash = await argon2.hash(changePasswordDto.newPassword);
    await this.userRepository
      .createQueryBuilder()
      .update(User)
      .set({ 
        passwordHash: newPasswordHash,
        updatedAt: Math.floor(Date.now() / 1000)
      })
      .where("id = :userId", { userId })
      .andWhere("isDeleted = false")
      .execute();
  }

}
