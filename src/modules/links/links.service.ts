import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Link } from "./entities/link.entity";
import { getCurrentTimestampSeconds } from "src/common/helpers/date.helper";
import {
  detectPlatform,
  normalizeUrl,
} from "./helpers/platform-detector.helper";
import { reorderLinks } from "./helpers/link.helper";
import { updateOnlyDefinedFields } from "src/common/helpers/update-defined-field.helper";
import { CreateLinkDto } from "./dto/create-link.dto";
import { UpdateLinkDto } from "./dto/update-link.dto";
import { LinkQueryDto } from "./dto/link-query.dto";
import { ReorderLinksDto } from "./dto/reorder-links.dto";
import { BulkOperationDto, BulkAction } from "./dto/bulk-operation.dto";
import { LinkDetailsQueryDto } from "./dto/link-details-query.dto";
import { LinkType } from "src/common/enums";

@Injectable()
export class LinksService {
  constructor(
    @InjectRepository(Link)
    private linkRepository: Repository<Link>,
  ) {}

  async createLink(userId: string, dto: CreateLinkDto) {
    const normalizedUrl = normalizeUrl(dto.url);
    const { platform, linkType } = detectPlatform(normalizedUrl);

    const existingLink = await this.linkRepository.findOne({
      where: {
        userId,
        url: normalizedUrl,
        isDeleted: false,
      },
    });

    if (existingLink) {
      throw new BadRequestException({
        errorCode: "LNK001",
        message: "A link with this URL already exists.",
      });
    }

    const link = this.linkRepository.create({
      userId,
      url: normalizedUrl,
      title: dto.title,
      description: dto.description || null,
      iconUrl: dto.iconUrl || null,
      thumbnailUrl: dto.thumbnailUrl || null,
      linkType: (dto.linkType || linkType) as LinkType,
      platformDetected: platform,
      category: dto.category || null,
      orderIndex: dto.displayOrder ?? 1,
      isActive: dto.isActive ?? true,
      scheduleStartAt: dto.scheduleStartAt || null,
      scheduleEndAt: dto.scheduleEndAt || null,
    });

    await this.linkRepository.save(link);

    return {
      message: "Link created successfully",
      errorCode: "LNK002",
      data: link,
    };
  }

  async updateLink(userId: string, linkId: string, dto: UpdateLinkDto) {
    const link = await this.linkRepository.findOne({
      where: { id: linkId, userId, isDeleted: false },
    });

    if (!link) {
      throw new NotFoundException({
        errorCode: "LNK003",
        message: "Link not found or you do not have permission.",
      });
    }

    // Normalize URL if updating
    if (dto.url) {
      const normalizedUrl = normalizeUrl(dto.url);

      // Check for duplicate URL (excluding current link)
      const duplicateLink = await this.linkRepository.findOne({
        where: {
          userId,
          url: normalizedUrl,
          isDeleted: false,
        },
      });

      if (duplicateLink && duplicateLink.id !== linkId) {
        throw new BadRequestException({
          errorCode: "LNK001",
          message: "A link with this URL already exists.",
        });
      }

      link.url = normalizedUrl;

      // Re-detect platform if URL changed
      const { platform, linkType } = detectPlatform(normalizedUrl);
      link.platformDetected = platform;
      if (!dto.linkType) {
        link.linkType = linkType as LinkType;
      }
    }

    // Update fields using helper to only update defined fields
    const updateData = updateOnlyDefinedFields({
      title: dto.title,
      description: dto.description,
      iconUrl: dto.iconUrl,
      thumbnailUrl: dto.thumbnailUrl,
      linkType: dto.linkType as LinkType | undefined,
      category: dto.category,
      orderIndex: dto.displayOrder,
      isActive: dto.isActive,
      scheduleStartAt: dto.scheduleStartAt,
      scheduleEndAt: dto.scheduleEndAt,
    });
    
    Object.assign(link, updateData);

    link.updatedAt = getCurrentTimestampSeconds();
    await this.linkRepository.save(link);

    return {
      message: "Link updated successfully",
      errorCode: "LNK004",
      data: link,
    };
  }

  async deleteLink(userId: string, linkId: string) {
    const link = await this.linkRepository.findOne({
      where: { id: linkId, userId, isDeleted: false },
    });

    if (!link) {
      throw new NotFoundException({
        errorCode: "LNK005",
        message: "Link not found or you do not have permission.",
      });
    }

    // Soft delete
    const now = getCurrentTimestampSeconds();
    link.isDeleted = true;
    link.deletedAt = now;
    link.deletedBy = userId;
    link.isActive = false;

    await this.linkRepository.save(link);

    return {
      message: "Link deleted successfully",
      errorCode: "LNK006",
      data: {},
    };
  }

  async restoreLink(userId: string, linkId: string) {
    const link = await this.linkRepository.findOne({
      where: { id: linkId, userId, isDeleted: true },
    });

    if (!link) {
      throw new NotFoundException({
        errorCode: "LNK007",
        message: "Link not found or is not deleted.",
      });
    }

    link.isDeleted = false;
    link.deletedAt = null;
    link.deletedBy = null;
    link.updatedAt = getCurrentTimestampSeconds();

    await this.linkRepository.save(link);

    return {
      message: "Link restored successfully",
      errorCode: "LNK008",
      data: link,
    };
  }

  async getLinkDetails(userId: string, dto: LinkDetailsQueryDto) {
    const link = await this.linkRepository
      .createQueryBuilder("link")
      .leftJoinAndSelect("link.analytics", "analytics")
      .where("link.id = :linkId", { linkId: dto.linkId })
      .andWhere("link.userId = :userId", { userId })
      .andWhere("link.isDeleted = false")
      .getOne();

    if (!link) {
      throw new NotFoundException({
        errorCode: "LNK009",
        message: "Link not found or you do not have permission.",
      });
    }

    // Analytics summary
    const analyticsSummary = await this.linkRepository.query(
      `
      SELECT
        COUNT(*) as total_clicks,
        COUNT(DISTINCT CASE WHEN a.country_code IS NOT NULL THEN a.country_code END) as unique_countries
      FROM analytics a
      WHERE a.link_id = $1 AND a.is_deleted = false
      `,
      [dto.linkId],
    );

    const now = getCurrentTimestampSeconds();
    const isScheduled =
      link.scheduleStartAt &&
      link.scheduleEndAt &&
      now >= link.scheduleStartAt &&
      now <= link.scheduleEndAt;

    return {
      data: {
        ...link,
        analyticsSummary: analyticsSummary[0] || {
          total_clicks: 0,
          unique_countries: 0,
        },
        isScheduled,
      },
      errorCode: "LNK010",
    };
  }

  async listLinks(userId: string, dto: LinkQueryDto) {
    const page =
      typeof dto.page === "string" ? parseInt(dto.page) : dto.page || 1;
    const limit =
      typeof dto.limit === "string" ? parseInt(dto.limit) : dto.limit || 10;
    const skip = (page - 1) * limit;

    const query = this.linkRepository
      .createQueryBuilder("link")
      .where("link.userId = :userId", { userId })
      .andWhere("link.isDeleted = false");

    // Search
    if (dto.search) {
      query.andWhere(
        "(link.title ILIKE :search OR link.description ILIKE :search OR link.url ILIKE :search)",
        { search: `%${dto.search}%` },
      );
    }

    // Filters
    if (dto.linkType) {
      query.andWhere("link.linkType = :linkType", { linkType: dto.linkType });
    }

    if (dto.category) {
      query.andWhere("link.category = :category", { category: dto.category });
    }

    if (dto.isActive !== undefined) {
      query.andWhere("link.isActive = :isActive", { isActive: dto.isActive });
    }

    // Date range
    if (dto.dateFrom) {
      query.andWhere("link.createdAt >= :dateFrom", { dateFrom: dto.dateFrom });
    }

    if (dto.dateTo) {
      query.andWhere("link.createdAt <= :dateTo", { dateTo: dto.dateTo });
    }

    // Sorting
    const sortBy = dto.sortBy || "orderIndex";
    const sortOrder = dto.sortOrder || "ASC";
    query.orderBy(`link.${sortBy}`, sortOrder as "ASC" | "DESC");

    // Pagination
    query.skip(skip).take(limit);

    const [links, total] = await query.getManyAndCount();

    return {
      data: links,
      total,
      errorCode: "LNK011",
    };
  }

  async reorderLinks(userId: string, dto: ReorderLinksDto) {
    if (!dto.links || dto.links.length === 0) {
      throw new BadRequestException({
        errorCode: "LNK012",
        message: "No links provided for reordering",
      });
    }

    try {
      const linkOrders = dto.links.map((item) => ({
        id: item.linkId,
        orderIndex: item.displayOrder ?? 0,
      }));

      await reorderLinks(this.linkRepository, userId, linkOrders);

      return {
        message: "Links reordered successfully",
        errorCode: "LNK013",
      };
    } catch (error: any) {
      console.error("Reorder error:", error);
      throw new BadRequestException({
        errorCode: "LNK014",
        message: error?.message || "Failed to reorder links",
      });
    }
  }

  async toggleLinkStatus(userId: string, linkId: string, isActive: boolean) {
    const link = await this.linkRepository.findOne({
      where: { id: linkId, userId, isDeleted: false },
    });

    if (!link) {
      throw new NotFoundException({
        errorCode: "LNK015",
        message: "Link not found or you do not have permission.",
      });
    }

    link.isActive = isActive;
    link.updatedAt = getCurrentTimestampSeconds();
    await this.linkRepository.save(link);

    return {
      message: `Link ${isActive ? "activated" : "deactivated"} successfully`,
      errorCode: "LNK016",
      data: link,
    };
  }

  async bulkOperation(userId: string, dto: BulkOperationDto) {
    const links = await this.linkRepository.find({
      where: {
        id: dto.linkIds as any,
        userId,
        isDeleted: false,
      },
    });

    if (links.length === 0) {
      throw new NotFoundException({
        errorCode: "LNK017",
        message: "No valid links found for bulk operation.",
      });
    }

    const now = getCurrentTimestampSeconds();

    switch (dto.action) {
      case BulkAction.DELETE:
        links.forEach((link) => {
          link.isDeleted = true;
          link.deletedAt = now;
          link.deletedBy = userId;
          link.isActive = false;
        });
        break;

      case BulkAction.ARCHIVE:
        links.forEach((link) => {
          link.isActive = false;
          link.updatedAt = now;
        });
        break;

      case BulkAction.ACTIVATE:
        links.forEach((link) => {
          link.isActive = true;
          link.updatedAt = now;
        });
        break;

      case BulkAction.DEACTIVATE:
        links.forEach((link) => {
          link.isActive = false;
          link.updatedAt = now;
        });
        break;

      case BulkAction.RESTORE:
        links.forEach((link) => {
          link.isDeleted = false;
          link.deletedAt = null;
          link.deletedBy = null;
          link.updatedAt = now;
        });
        break;
    }

    await this.linkRepository.save(links);

    return {
      message: `Bulk ${dto.action} completed successfully`,
      errorCode: "LNK018",
      data: { affected: links.length },
    };
  }

  async getPublicLinks(username: string) {
    const now = getCurrentTimestampSeconds();

    const links = await this.linkRepository
      .createQueryBuilder("link")
      .leftJoin("link.user", "user")
      .where("user.username = :username", { username })
      .andWhere("link.isDeleted = false")
      .andWhere("link.isActive = true")
      .andWhere(
        "(link.scheduleStartAt IS NULL OR link.scheduleStartAt <= :now)",
        { now },
      )
      .andWhere("(link.scheduleEndAt IS NULL OR link.scheduleEndAt >= :now)", {
        now,
      })
      .orderBy("link.orderIndex", "ASC")
      .select([
        "link.id",
        "link.title",
        "link.url",
        "link.description",
        "link.iconUrl",
        "link.thumbnailUrl",
        "link.linkType",
        "link.platformDetected",
        "link.category",
        "link.orderIndex",
        "link.clickCount",
      ])
      .getMany();

    return {
      data: links,
      errorCode: "LNK019",
    };
  }
}
