import { Injectable, NotFoundException, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { User } from "./entities/user.entity";
import { Media } from "../storage/entities/media.entity";
import { updateOnlyDefinedFields } from "src/common/helpers/update-defined-field.helper";
import { getCurrentTimestampSeconds } from "src/common/helpers/date.helper";

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Media)
    private readonly mediaRepository: Repository<Media>,
  ) {}

  async getProfile(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId, isDeleted: false },
      relations: ["avatarMedia"],
      select: [
        "id",
        "email",
        "username",
        "displayName",
        "avatarMediaId",
        "bioText",
        "profession",
        "themeSettings",
        "plan",
        "totalProfileViews",
        "totalAiTokensUsed",
        "lastLoginAt",
        "createdAt",
        "updatedAt",
        "isActive",
      ],
    });

    if (!user) {
      this.logger.warn(`User not found: ${userId}`);
      throw new NotFoundException({
        errorCode: "USER001",
        message: "User not found",
      });
    }

    const { avatarMedia, ...userData } = user;

    return {
      ...userData,
      avatarUrl: avatarMedia?.secureUrl ?? null,
    };
  }

  async updateProfile(
    userId: string,
    updateData: UpdateProfileDto,
  ) {
    const user = await this.userRepository.findOne({
      where: { id: userId, isDeleted: false },
    });

    if (!user) {
      this.logger.warn(`User not found for update: ${userId}`);
      throw new NotFoundException({
        errorCode: "USER001",
        message: "User not found",
      });
    }

    const fieldsToCheck = {
      displayName: updateData.displayName,
      username: updateData.username,
      bioText: updateData.bioText,
      bio: (updateData as any).bio,
      profession: updateData.profession,
      avatarMediaId: updateData.avatar_url,
    };

    const definedFields = updateOnlyDefinedFields(fieldsToCheck);

    if (
      definedFields.bio !== undefined &&
      definedFields.bioText === undefined
    ) {
      definedFields.bioText = definedFields.bio;
    }

    Object.assign(user, {
      displayName: definedFields.displayName ?? user.displayName,
      username: definedFields.username ?? user.username,
      bioText: definedFields.bioText ?? user.bioText,
      profession: definedFields.profession ?? user.profession,
      avatarMediaId: definedFields.avatarMediaId ?? user.avatarMediaId,
    });

    user.updatedAt = getCurrentTimestampSeconds();

    const updatedUser = await this.userRepository.save(user);

    const {
      passwordHash,
      googleId,
      githubId,
      passwordResetToken,
      passwordResetExpiresAt,
      avatarMedia,
      ...userWithoutSensitiveData
    } = updatedUser;

    let avatarUrl: string | null = null;
    if (updatedUser.avatarMediaId) {
      const media = await this.mediaRepository.findOne({
        where: { id: updatedUser.avatarMediaId },
      });
      avatarUrl = media?.secureUrl ?? null;
    }

    return {
      ...userWithoutSensitiveData,
      avatarMediaId: updatedUser.avatarMediaId,
      avatarUrl,
    };
  }

  async incrementTokenUsage(userId: string, tokensUsed: number): Promise<void> {
    await this.userRepository
      .createQueryBuilder()
      .update(User)
      .set({
        totalAiTokensUsed: () => `total_ai_tokens_used + ${tokensUsed}`,
        updatedAt: getCurrentTimestampSeconds(),
      })
      .where("id = :userId", { userId })
      .andWhere("isDeleted = false")
      .execute();
  }
}
