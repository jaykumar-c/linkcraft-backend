import {
  Controller,
  Post,
  Get,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { User } from "../users/entities/user.entity";
import { AnalyticsService } from "./analytics.service";
import { CreateAnalyticsDto } from "./dto/create-analytics.dto";
import { LinkAnalyticsQueryDto } from "./dto/link-analytics-query.dto";

@Controller("analytics")
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  // Public endpoint for tracking link clicks
  @Post("track")
  @HttpCode(HttpStatus.OK)
  async trackClick(@Body() body: CreateAnalyticsDto) {
    return this.analyticsService.trackLinkClick(body);
  }

  @UseGuards(JwtAuthGuard)
  @Get("link")
  @HttpCode(HttpStatus.OK)
  async getLinkAnalytics(
    @CurrentUser() user: User,
    @Query() query: LinkAnalyticsQueryDto,
  ) {
    return this.analyticsService.getLinkAnalytics(user.id, query);
  }

  @UseGuards(JwtAuthGuard)
  @Get("overview")
  @HttpCode(HttpStatus.OK)
  async getAnalyticsOverview(@CurrentUser() user: User) {
    return this.analyticsService.getOverview(user.id);
  }
}
