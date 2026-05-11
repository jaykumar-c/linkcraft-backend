import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as argon2 from 'argon2';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { User } from './entities/user.entity';

/**
 * Service responsible for user profile operations.
 * Uses raw SQL queries for optimal performance and direct database control.
 */
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly dataSource: DataSource) {}

  /**
   * Retrieves the current user's profile by ID.
   * Excludes sensitive fields like password_hash, reset tokens, and OAuth IDs.
   *
   * @param userId - The UUID of the user to retrieve
   * @returns Promise<User> - The user entity without sensitive data
   * @throws NotFoundException - If user is not found or is deleted
   */
  async getProfile(userId: string): Promise<Partial<User>> {

    const query = `
      SELECT 
        id,
        email,
        username,
        display_name,
        avatar_url,
        bio_text,
        profession,
        theme_settings,
        plan,
        total_profile_views,
        total_ai_tokens_used,
        last_login_at,
        created_at,
        updated_at,
        is_active
      FROM users
      WHERE id = $1 
        AND is_deleted = false
    `;

    const result = await this.dataSource.query(query, [userId]);

    if (!result || result.length === 0) {
      this.logger.warn(`User not found: ${userId}`);
      throw new NotFoundException({
        errorCode: 'USER001',
        message: 'User not found',
      });
    }

    return result[0];
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

    // Build dynamic update query based on provided fields
    const updateFields: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (updateData.displayName !== undefined) {
      updateFields.push(`display_name = $${paramIndex++}`);
      queryParams.push(updateData.displayName);
    }

    if (updateData.username !== undefined) {
      updateFields.push(`username = $${paramIndex++}`);
      queryParams.push(updateData.username);
    }

    if (updateData.bioText !== undefined) {
      updateFields.push(`bio_text = $${paramIndex++}`);
      queryParams.push(updateData.bioText);
    }

    // Also check for 'bio' field and map to bio_text
    if ((updateData as any).bio !== undefined) {
      updateFields.push(`bio_text = $${paramIndex++}`);
      queryParams.push((updateData as any).bio);
    }

    if (updateData.profession !== undefined) {
      updateFields.push(`profession = $${paramIndex++}`);
      queryParams.push(updateData.profession);
    }

    if (updateData.avatar_url !== undefined) {
      updateFields.push(`avatar_url = $${paramIndex++}`);
      queryParams.push(updateData.avatar_url);
    }

    // Always update the updated_at timestamp
    updateFields.push(`updated_at = $${paramIndex++}`);
    queryParams.push(Math.floor(Date.now() / 1000));

    // Add user ID as the last parameter
    queryParams.push(userId);

    const updateQuery = `
      UPDATE users
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
        AND is_deleted = false
      RETURNING 
        id,
        email,
        username,
        display_name,
        avatar_url,
        bio_text,
        profession,
        theme_settings,
        plan,
        total_profile_views,
        last_login_at,
        created_at,
        updated_at,
        is_active
    `;

    const result = await this.dataSource.query(updateQuery, queryParams);

    if (!result || result.length === 0) {
      this.logger.warn(`User not found for update: ${userId}`);
      throw new NotFoundException({
        errorCode: 'USER001',
        message: 'User not found',
      });
    }

    return result[0];
  }

  async incrementTokenUsage(userId: string, tokensUsed: number): Promise<void> {
    const query = `
      UPDATE users
      SET total_ai_tokens_used = total_ai_tokens_used + $1,
          updated_at = $2
      WHERE id = $3
        AND is_deleted = false
    `;

    await this.dataSource.query(query, [tokensUsed, Math.floor(Date.now() / 1000), userId]);
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto): Promise<void> {
    if (!userId) {
      throw new NotFoundException({
        errorCode: 'UCP005',
        message: 'User not found',
      });
    }

    const query = `
      SELECT id, password_hash, is_active, is_deleted
      FROM users
      WHERE id = $1 AND is_deleted = false
    `;

    const result = await this.dataSource.query(query, [userId]);
    if (!result || result.length === 0) {
      throw new NotFoundException({
        errorCode: 'UCP005',
        message: 'User not found',
      });
    }

    const user = result[0];

    if (!user.is_active) {
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

    const isValid = await argon2.verify(user.password_hash, changePasswordDto.currentPassword);
    if (!isValid) {
      throw new BadRequestException({
        errorCode: 'UCP008',
        message: 'Current password is incorrect',
      });
    }

    const newPasswordHash = await argon2.hash(changePasswordDto.newPassword);
    const updateQuery = `
      UPDATE users
      SET password_hash = $1, updated_at = $2
      WHERE id = $3 AND is_deleted = false
    `;

    await this.dataSource.query(updateQuery, [newPasswordHash, Math.floor(Date.now() / 1000), userId]);
  }

}
