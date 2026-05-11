import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Analytics } from "./entities/analytics.entity";
import { Link } from "../links/entities/link.entity";
import { CreateAnalyticsDto } from "./dto/create-analytics.dto";
import { LinkAnalyticsQueryDto } from "./dto/link-analytics-query.dto";
import { AnalyticsEventType } from "src/common/enums";

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Analytics)
    private analyticsRepository: Repository<Analytics>,
    @InjectRepository(Link)
    private linkRepository: Repository<Link>,
  ) {}

  async trackLinkClick(dto: CreateAnalyticsDto) {
    const link = await this.linkRepository.findOne({
      where: { id: dto.linkId, isDeleted: false, isActive: true },
    });

    if (!link) {
      throw new NotFoundException({
        errorCode: "ANC001",
        message: "Link not found or inactive.",
      });
    }

    const analytics = this.analyticsRepository.create({
      linkId: dto.linkId,
      userId: link.userId,
      eventType: (dto.eventType || AnalyticsEventType.LINK_CLICK) as AnalyticsEventType,
      userAgent: dto.userAgent || null,
      referrer: dto.referrer || null,
      countryCode: dto.countryCode || null,
      countryName: dto.countryName || null,
      deviceType: dto.deviceType || null,
      browser: dto.browser || null,
      os: dto.os || null,
      ipHash: dto.ipHash || null,
      sessionId: dto.sessionId || null,
      uniqueClickId: dto.uniqueClickId || null,
    });

    await this.analyticsRepository.save(analytics);
    await this.linkRepository.increment({ id: dto.linkId }, "clickCount", 1);

    return {
      errorCode: "ANC002",
    };
  }

  async getLinkAnalytics(userId: string, dto: LinkAnalyticsQueryDto) {
    const link = await this.linkRepository.findOne({
      where: { id: dto.linkId, userId, isDeleted: false },
    });

    if (!link) {
      throw new NotFoundException({
        errorCode: "ANC003",
        message: "Link not found or you do not have permission.",
      });
    }

    const page = dto.page || 1;
    const limit = dto.limit || 50;
    const skip = (page - 1) * limit;

    const query = this.analyticsRepository
      .createQueryBuilder("analytics")
      .where("analytics.linkId = :linkId", { linkId: dto.linkId })
      .andWhere("analytics.isDeleted = false");

    if (dto.eventType) {
      query.andWhere("analytics.eventType = :eventType", {
        eventType: dto.eventType,
      });
    }

    if (dto.countryCode) {
      query.andWhere("analytics.countryCode = :countryCode", {
        countryCode: dto.countryCode,
      });
    }

    if (dto.deviceType) {
      query.andWhere("analytics.deviceType = :deviceType", {
        deviceType: dto.deviceType,
      });
    }

    if (dto.dateFrom) {
      query.andWhere("analytics.createdAt >= :dateFrom", {
        dateFrom: dto.dateFrom,
      });
    }

    if (dto.dateTo) {
      query.andWhere("analytics.createdAt <= :dateTo", {
        dateTo: dto.dateTo,
      });
    }

    query.orderBy("analytics.createdAt", "DESC").skip(skip).take(limit);

    const [analytics, total] = await query.getManyAndCount();

    const stats = await this.analyticsRepository.query(
      `
      SELECT
        COUNT(*) as total_clicks,
        COUNT(DISTINCT ip_hash) as unique_clicks,
        COUNT(DISTINCT country_code) as countries_count,
        COUNT(DISTINCT device_type) as device_types_count
      FROM analytics
      WHERE link_id = $1 AND is_deleted = false
      `,
      [dto.linkId],
    );

    return {
      errorCode: "ANC004",
      data: {
        analytics,
        stats: stats[0] || {
          total_clicks: 0,
          unique_clicks: 0,
          countries_count: 0,
          device_types_count: 0,
        },
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  }

  async getClickSummary(linkId: string) {
    const summary = await this.analyticsRepository.query(
      `
      SELECT
        COUNT(*) as total_clicks,
        COUNT(DISTINCT ip_hash) as unique_clicks,
        COUNT(DISTINCT country_code) as unique_countries,
        COUNT(DISTINCT device_type) as device_types
      FROM analytics
      WHERE link_id = $1 AND is_deleted = false
      `,
      [linkId],
    );

    return summary[0] || null;
  }

  async getOverview(userId: string) {
    const overview = await this.analyticsRepository.query(
      `
      SELECT
        COALESCE(SUM(CASE WHEN event_type = 'profile_view' THEN 1 ELSE 0 END), 0) as total_views,
        COALESCE(SUM(CASE WHEN event_type = 'link_click' THEN 1 ELSE 0 END), 0) as total_clicks
      FROM analytics
      WHERE user_id = $1 AND is_deleted = false
      `,
      [userId],
    );

    const totalViews = parseInt(overview[0]?.total_views || "0");
    const totalClicks = parseInt(overview[0]?.total_clicks || "0");
    const clickRate = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : "0";

    return {
      errorCode: "ANC005",
      data: {
        totalViews,
        totalClicks,
        clickRate: parseFloat(clickRate),
      },
    };
  }
}