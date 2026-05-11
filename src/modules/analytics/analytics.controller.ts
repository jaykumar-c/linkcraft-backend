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
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { User } from "../users/entities/user.entity";
import { AnalyticsService } from "./analytics.service";
import { CreateAnalyticsDto } from "./dto/create-analytics.dto";
import { LinkAnalyticsQueryDto } from "./dto/link-analytics-query.dto";

@Controller("analytics")
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post("track")
  @HttpCode(HttpStatus.OK)
  async trackClick(@Body() body: CreateAnalyticsDto) {
    const result = await this.analyticsService.trackLinkClick(body);
    return {
      message: '',
      errorCode: 'ANC006',
      data: result,
      error: '',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get("link")
  @HttpCode(HttpStatus.OK)
  async getLinkAnalytics(
    @CurrentUser() user: User,
    @Query() query: LinkAnalyticsQueryDto,
  ) {
    const result = await this.analyticsService.getLinkAnalytics(user.id, query);
    return {
      message: '',
      errorCode: 'ANC007',
      data: result,
      error: '',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get("overview")
  @HttpCode(HttpStatus.OK)
  async getAnalyticsOverview(@CurrentUser() user: User) {
    const result = await this.analyticsService.getOverview(user.id);
    return {
      message: '',
      errorCode: 'ANC008',
      data: result,
      error: '',
    };
  }
}