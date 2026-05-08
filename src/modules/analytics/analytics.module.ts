import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AnalyticsService } from "./analytics.service";
import { AnalyticsController } from "./analytics.controller";
import { Analytics } from "./entities/analytics.entity";
import { Link } from "../links/entities/link.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Analytics, Link])],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
