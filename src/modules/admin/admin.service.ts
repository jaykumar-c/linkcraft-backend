import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ConfigService } from "@nestjs/config";
import * as argon2 from "argon2";
import { User } from "../users/entities/user.entity";
import { Link } from "../links/entities/link.entity";
import { Analytics } from "../analytics/entities/analytics.entity";
import { AiGeneration } from "../ai/entities/ai-generation.entity";
import { AdminUserQueryDto } from "./dto/admin-user-query.dto";
import {
  AdminAnalyticsQueryDto,
  AdminTopLinksQueryDto,
} from "./dto/admin-analytics-query.dto";
import { AdminAiHistoryQueryDto } from "./dto/admin-ai-history-query.dto";
import { UserRole, UserPlan } from "src/common/enums";
import { getCurrentTimestampSeconds } from "src/common/helpers/date.helper";

@Injectable()
export class AdminService implements OnModuleInit {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Link)
    private readonly linkRepository: Repository<Link>,
    @InjectRepository(Analytics)
    private readonly analyticsRepository: Repository<Analytics>,
    @InjectRepository(AiGeneration)
    private readonly aiGenerationRepository: Repository<AiGeneration>,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    const adminEmail =
      this.configService.get<string>("ADMIN_EMAIL") || "admin@linkcraft.ai";
    const adminPassword =
      this.configService.get<string>("ADMIN_PASSWORD") || "Admin@123";

    const existing = await this.userRepository.findOne({
      where: { email: adminEmail, isDeleted: false },
    });

    if (!existing) {
      const passwordHash = await argon2.hash(adminPassword);
      await this.userRepository.save({
        email: adminEmail,
        username: "admin",
        displayName: "Admin",
        passwordHash,
        role: UserRole.ADMIN,
        plan: UserPlan.ENTERPRISE,
        isActive: true,
      });
      this.logger.log(`Default admin user created: ${adminEmail}`);
    } else if (existing.role !== UserRole.ADMIN) {
      existing.role = UserRole.ADMIN;
      existing.plan = UserPlan.ENTERPRISE;
      await this.userRepository.save(existing);
      this.logger.log(`Existing user ${adminEmail} promoted to admin`);
    }
  }

  async getDashboard() {
    const now = getCurrentTimestampSeconds();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60;

    const [
      totalUsers,
      totalLinks,
      totalGenerations,
      overview,
      usersByPlan,
      linksByType,
      activeUsers,
      topTokenUsers,
      recentUsers,
    ] = await Promise.all([
      this.userRepository.count({ where: { isDeleted: false } }),

      this.linkRepository.count({ where: { isDeleted: false } }),

      this.aiGenerationRepository.count(),

      this.analyticsRepository.query(
        `
        SELECT
          COALESCE(SUM(CASE WHEN event_type = 'profile_view' THEN 1 ELSE 0 END), 0) AS total_views,
          COALESCE(SUM(CASE WHEN event_type = 'link_click' THEN 1 ELSE 0 END), 0) AS total_clicks
        FROM analytics
        WHERE is_deleted = false
        `,
      ),
      this.userRepository
        .createQueryBuilder("user")
        .select("user.plan", "plan")
        .addSelect("COUNT(*)", "count")
        .where("user.is_deleted = false")
        .groupBy("user.plan")
        .getRawMany(),
      this.linkRepository
        .createQueryBuilder("link")
        .select("link.link_type", "link_type")
        .addSelect("COUNT(*)", "count")
        .where("link.is_deleted = false")
        .groupBy("link.link_type")
        .getRawMany(),
      this.userRepository
        .createQueryBuilder("user")
        .where("user.is_deleted = false")
        .andWhere("user.last_login_at > :sevenDaysAgo", { sevenDaysAgo })
        .getCount(),
      this.userRepository
        .createQueryBuilder("user")
        .select([
          "user.id",
          "user.email",
          "user.username",
          "user.total_ai_tokens_used",
        ])
        .where("user.is_deleted = false")
        .orderBy("user.total_ai_tokens_used", "DESC")
        .limit(5)
        .getMany(),
      this.userRepository
        .createQueryBuilder("user")
        .where("user.is_deleted = false")
        .orderBy("user.created_at", "DESC")
        .limit(5)
        .getMany(),
    ]);

    return {
      errorCode: "ADMS003",
      data: {
        totals: {
          users: totalUsers,
          links: totalLinks,
          aiGenerations: totalGenerations,
          views: parseInt(overview[0]?.total_views || "0"),
          clicks: parseInt(overview[0]?.total_clicks || "0"),
        },
        usersByPlan: usersByPlan.map((r: any) => ({
          plan: r.plan,
          count: parseInt(r.count),
        })),
        linksByType: linksByType.map((r: any) => ({
          type: r.link_type,
          count: parseInt(r.count),
        })),
        activeUsersLast7Days: activeUsers,
        topTokenUsers: topTokenUsers.map((u) => ({
          id: u.id,
          email: u.email,
          username: u.username,
          totalAiTokensUsed: u.totalAiTokensUsed,
        })),
        recentUsers: recentUsers.map((u) => ({
          id: u.id,
          email: u.email,
          username: u.username,
          createdAt: u.createdAt,
        })),
      },
    };
  }

  async getUsers(dto: AdminUserQueryDto) {
    if (dto.id) {
      return this.getUserById(dto.id);
    }

    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const skip = (page - 1) * limit;

    const query = this.userRepository
      .createQueryBuilder("user")
      .leftJoinAndSelect("user.avatarMedia", "media")
      .where("user.is_deleted = false");

    if (dto.search) {
      query.andWhere(
        "(user.email ILIKE :search OR user.username ILIKE :search OR user.display_name ILIKE :search)",
        { search: `%${dto.search}%` },
      );
    }

    if (dto.plan) {
      query.andWhere("user.plan = :plan", { plan: dto.plan });
    }

    if (dto.role) {
      query.andWhere("user.role = :role", { role: dto.role });
    }

    if (dto.isActive !== undefined) {
      query.andWhere("user.is_active = :isActive", { isActive: dto.isActive });
    }

    if (dto.dateFrom) {
      query.andWhere("user.created_at >= :dateFrom", {
        dateFrom: dto.dateFrom,
      });
    }

    if (dto.dateTo) {
      query.andWhere("user.created_at <= :dateTo", { dateTo: dto.dateTo });
    }

    const sortBy = dto.sortBy || "createdAt";
    const sortOrder = dto.sortOrder || "DESC";
    query.orderBy(`user.${sortBy}`, sortOrder as "ASC" | "DESC");

    query.skip(skip).take(limit);

    const [users, total] = await query.getManyAndCount();

    const enriched = await Promise.all(
      users.map(async (user) => {
        const linkCount = await this.linkRepository.count({
          where: { userId: user.id, isDeleted: false },
        });
        return {
          id: user.id,
          email: user.email,
          username: user.username,
          displayName: user.displayName,
          avatarUrl: (user as any).avatarMedia?.secureUrl ?? null,
          role: user.role,
          plan: user.plan,
          isActive: user.isActive,
          linkCount,
          totalAiTokensUsed: user.totalAiTokensUsed,
          totalProfileViews: user.totalProfileViews,
          lastLoginAt: user.lastLoginAt,
          createdAt: user.createdAt,
        };
      }),
    );

    return {
      errorCode: "ADMS004",
      data: enriched,
      total,
    };
  }

  private async getUserById(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId, isDeleted: false },
      relations: ["avatarMedia"],
    });

    if (!user) {
      return {
        errorCode: "ADM002",
        data: null,
      };
    }

    const [linkCount, genCount, analytics] = await Promise.all([
      this.linkRepository.count({ where: { userId, isDeleted: false } }),
      this.aiGenerationRepository.count({ where: { userId } }),
      this.analyticsRepository.query(
        `
        SELECT
          COUNT(*) AS total_events,
          COALESCE(SUM(CASE WHEN event_type = 'profile_view' THEN 1 ELSE 0 END), 0) AS total_views,
          COALESCE(SUM(CASE WHEN event_type = 'link_click' THEN 1 ELSE 0 END), 0) AS total_clicks
        FROM analytics
        WHERE user_id = $1 AND is_deleted = false
        `,
        [userId],
      ),
    ]);

    const { avatarMedia, ...userData } = user;

    return {
      errorCode: "ADMS005",
      data: {
        ...userData,
        avatarUrl: avatarMedia?.secureUrl ?? null,
        stats: {
          linkCount,
          generationCount: genCount,
          totalViews: parseInt(analytics[0]?.total_views || "0"),
          totalClicks: parseInt(analytics[0]?.total_clicks || "0"),
        },
      },
    };
  }

  async getAnalyticsOverview(dto: AdminAnalyticsQueryDto) {
    const query = this.analyticsRepository
      .createQueryBuilder("a")
      .where("a.is_deleted = false");

    if (dto.userId) {
      query.andWhere("a.user_id = :userId", { userId: dto.userId });
    }

    if (dto.eventType) {
      query.andWhere("a.event_type = :eventType", { eventType: dto.eventType });
    }

    if (dto.dateFrom) {
      query.andWhere("a.created_at >= :dateFrom", { dateFrom: dto.dateFrom });
    }

    if (dto.dateTo) {
      query.andWhere("a.created_at <= :dateTo", { dateTo: dto.dateTo });
    }

    const stats = await query
      .select([
        "COUNT(*) AS total_events",
        "COUNT(DISTINCT a.user_id) AS unique_users",
        "COUNT(DISTINCT a.country_code) AS unique_countries",
        "COUNT(DISTINCT a.device_type) AS device_types",
      ])
      .getRawOne();

    const byEventType = await query
      .clone()
      .select(["a.event_type", "COUNT(*) AS count"])
      .groupBy("a.event_type")
      .getRawMany();

    return {
      errorCode: "ADMS006",
      data: {
        totalEvents: parseInt(stats?.total_events || "0"),
        uniqueUsers: parseInt(stats?.unique_users || "0"),
        uniqueCountries: parseInt(stats?.unique_countries || "0"),
        deviceTypes: parseInt(stats?.device_types || "0"),
        byEventType: byEventType.map((r: any) => ({
          eventType: r.event_type,
          count: parseInt(r.count),
        })),
      },
    };
  }

  async getDailyAnalytics(dto: AdminAnalyticsQueryDto) {
    const query = this.analyticsRepository
      .createQueryBuilder("a")
      .where("a.is_deleted = false");

    if (dto.userId) {
      query.andWhere("a.user_id = :userId", { userId: dto.userId });
    }

    if (dto.eventType) {
      query.andWhere("a.event_type = :eventType", { eventType: dto.eventType });
    }

    if (dto.dateFrom) {
      query.andWhere("a.created_at >= :dateFrom", { dateFrom: dto.dateFrom });
    }

    if (dto.dateTo) {
      query.andWhere("a.created_at <= :dateTo", { dateTo: dto.dateTo });
    }

    const daily = await query
      .select([
        "DATE_TRUNC('day', to_timestamp(a.created_at)) AS day",
        "COUNT(*) AS events",
        "COUNT(DISTINCT a.user_id) AS unique_users",
      ])
      .groupBy("day")
      .orderBy("day", "ASC")
      .getRawMany();

    return {
      errorCode: "ADMS007",
      data: daily.map((r: any) => ({
        date: r.day,
        events: parseInt(r.events),
        uniqueUsers: parseInt(r.unique_users),
      })),
    };
  }

  async getTopLinks(dto: AdminTopLinksQueryDto) {
    const limit = dto.limit || 10;
    const query = this.linkRepository
      .createQueryBuilder("link")
      .leftJoinAndSelect("link.user", "user")
      .where("link.is_deleted = false")
      .orderBy("link.click_count", "DESC")
      .limit(limit);

    if (dto.dateFrom) {
      query.andWhere("link.created_at >= :dateFrom", {
        dateFrom: dto.dateFrom,
      });
    }

    if (dto.dateTo) {
      query.andWhere("link.created_at <= :dateTo", { dateTo: dto.dateTo });
    }

    const links = await query.getMany();

    return {
      errorCode: "ADMS008",
      data: links.map((link) => ({
        id: link.id,
        title: link.title,
        url: link.url,
        clickCount: link.clickCount,
        linkType: link.linkType,
        user: {
          id: (link as any).user?.id,
          email: (link as any).user?.email,
          username: (link as any).user?.username,
        },
      })),
    };
  }

  async getAiHistory(dto: AdminAiHistoryQueryDto) {
    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const skip = (page - 1) * limit;

    const query = this.aiGenerationRepository
      .createQueryBuilder("gen")
      .leftJoinAndSelect("gen.user", "user")
      .leftJoinAndSelect("user.avatarMedia", "avatarMedia")
      .select([
        "gen.id",
        "gen.userId",
        "gen.model",
        "gen.tone",
        "gen.length",
        "gen.status",
        "gen.tokensTotal",
        "gen.costUsd",
        "gen.wasApplied",
        "gen.createdAt",
        "user.id",
        "user.email",
        "user.username",
        "avatarMedia.secureUrl",
      ]);

    if (dto.userId) {
      query.andWhere("gen.user_id = :userId", { userId: dto.userId });
    }

    if (dto.model) {
      query.andWhere("gen.model = :model", { model: dto.model });
    }

    if (dto.status) {
      query.andWhere("gen.status = :status", { status: dto.status });
    }

    if (dto.tone) {
      query.andWhere("gen.tone = :tone", { tone: dto.tone });
    }

    if (dto.dateFrom) {
      query.andWhere("gen.created_at >= :dateFrom", { dateFrom: dto.dateFrom });
    }

    if (dto.dateTo) {
      query.andWhere("gen.created_at <= :dateTo", { dateTo: dto.dateTo });
    }

    query.orderBy("gen.createdAt", "DESC").skip(skip).take(limit);

    const [generations, total] = await query.getManyAndCount();

    const mapped = generations.map((gen) => {
      const u = (gen as any).user;
      return {
        id: gen.id,
        userId: gen.userId,
        model: gen.model,
        tone: gen.tone,
        length: gen.length,
        status: gen.status,
        tokensTotal: gen.tokensTotal,
        costUsd: gen.costUsd,
        wasApplied: gen.wasApplied,
        createdAt: gen.createdAt,
        user: {
          id: u?.id,
          email: u?.email,
          username: u?.username,
          avatarUrl: u?.avatarMedia?.secureUrl ?? null,
        },
      };
    });

    return {
      errorCode: "ADMS009",
      data: mapped,
      total,
    };
  }

  async getAiStats() {
    const stats = await this.aiGenerationRepository.query(
      `
      SELECT
        COUNT(*) AS total_generations,
        COALESCE(SUM(tokens_total), 0) AS total_tokens,
        COALESCE(SUM(cost_usd), 0) AS total_cost_usd,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0) AS succeeded,
        COALESCE(SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END), 0) AS failed,
        COALESCE(SUM(CASE WHEN status = 'moderated' THEN 1 ELSE 0 END), 0) AS moderated
      FROM ai_generations
      `,
    );

    const byModel = await this.aiGenerationRepository
      .createQueryBuilder("gen")
      .select([
        "gen.model AS model",
        "COUNT(*) AS count",
        "COALESCE(SUM(gen.tokens_total), 0) AS tokens",
      ])
      .groupBy("gen.model")
      .getRawMany();

    const byTone = await this.aiGenerationRepository
      .createQueryBuilder("gen")
      .select([
        "gen.tone AS tone",
        "COUNT(*) AS count",
        "COALESCE(SUM(gen.tokens_total), 0) AS tokens",
      ])
      .groupBy("gen.tone")
      .getRawMany();

    const byLength = await this.aiGenerationRepository
      .createQueryBuilder("gen")
      .select([
        "gen.length AS length",
        "COUNT(*) AS count",
        "COALESCE(SUM(gen.tokens_total), 0) AS tokens",
      ])
      .groupBy("gen.length")
      .getRawMany();

    const topUsers = await this.aiGenerationRepository
      .createQueryBuilder("gen")
      .leftJoin("gen.user", "user")
      .leftJoin("user.avatarMedia", "avatar")
      .select([
        "gen.user_id AS user_id",
        "user.email AS email",
        "user.username AS username",
        "avatar.secure_url AS avatar_url",
        "COUNT(*) AS generation_count",
        "COALESCE(SUM(gen.tokens_total), 0) AS total_tokens",
      ])
      .groupBy("gen.user_id")
      .addGroupBy("user.email")
      .addGroupBy("user.username")
      .addGroupBy("avatar.secure_url")
      .orderBy("total_tokens", "DESC")
      .limit(5)
      .getRawMany();

    return {
      errorCode: "ADMS010",
      data: {
        totals: {
          generations: parseInt(stats[0]?.total_generations || "0"),
          tokens: parseInt(stats[0]?.total_tokens || "0"),
          costUsd: parseFloat(stats[0]?.total_cost_usd || "0"),
        },
        statusBreakdown: {
          succeeded: parseInt(stats[0]?.succeeded || "0"),
          failed: parseInt(stats[0]?.failed || "0"),
          moderated: parseInt(stats[0]?.moderated || "0"),
        },
        byModel: Object.fromEntries(
          byModel
            .filter((r: any) => r.model)
            .map((r: any) => [
              r.model,
              { count: parseInt(r.count), tokens: parseInt(r.tokens) },
            ]),
        ),
        byTone: Object.fromEntries(
          byTone
            .filter((r: any) => r.tone)
            .map((r: any) => [
              r.tone,
              { count: parseInt(r.count), tokens: parseInt(r.tokens) },
            ]),
        ),
        byLength: Object.fromEntries(
          byLength
            .filter((r: any) => r.length)
            .map((r: any) => [
              r.length,
              { count: parseInt(r.count), tokens: parseInt(r.tokens) },
            ]),
        ),
        topUsers: topUsers.map((r: any) => ({
          userId: r.user_id,
          email: r.email,
          username: r.username,
          avatarUrl: r.avatar_url ?? null,
          generationCount: parseInt(r.generation_count),
          totalTokens: parseInt(r.total_tokens),
        })),
      },
    };
  }
}
