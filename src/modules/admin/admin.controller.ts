import {
  Controller,
  Get,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { AdminGuard } from "./guards/admin.guard";
import { AdminService } from "./admin.service";
import { AdminUserQueryDto } from "./dto/admin-user-query.dto";
import {
  AdminAnalyticsQueryDto,
  AdminTopLinksQueryDto,
} from "./dto/admin-analytics-query.dto";
import { AdminAiHistoryQueryDto } from "./dto/admin-ai-history-query.dto";

@Controller("admin")
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("dashboard")
  @HttpCode(HttpStatus.OK)
  async getDashboard() {
    return this.adminService.getDashboard();
  }

  @Get("users")
  @HttpCode(HttpStatus.OK)
  async getUsers(@Query() query: AdminUserQueryDto) {
    const result: any = await this.adminService.getUsers(query);
    if (!result.data) {
      return {
        message: "User not found",
        errorCode: "ADM002",
        data: {},
        error: "",
      };
    }
    return {
      message: "",
      errorCode: result.errorCode,
      data: result.data,
      error: "",
      ...("total" in result ? { total: result.total } : {}),
    };
  }

  @Get("analytics/overview")
  @HttpCode(HttpStatus.OK)
  async getAnalyticsOverview(@Query() query: AdminAnalyticsQueryDto) {
    return this.adminService.getAnalyticsOverview(query);
  }

  // @Get("analytics/daily")
  // @HttpCode(HttpStatus.OK)
  // async getDailyAnalytics(@Query() query: AdminAnalyticsQueryDto) {
  //   return this.adminService.getDailyAnalytics(query);
  // }

  // @Get("analytics/top-links")
  // @HttpCode(HttpStatus.OK)
  // async getTopLinks(@Query() query: AdminTopLinksQueryDto) {
  //   return this.adminService.getTopLinks(query);
  // }

  @Get("ai/history")
  @HttpCode(HttpStatus.OK)
  async getAiHistory(@Query() query: AdminAiHistoryQueryDto) {
    return this.adminService.getAiHistory(query);
  }

  @Get("ai/stats")
  @HttpCode(HttpStatus.OK)
  async getAiStats() {
    return this.adminService.getAiStats();
  }
}
