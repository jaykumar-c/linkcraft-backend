import { IsOptional, IsString, IsNumber, IsEnum, Min } from "class-validator";
import { Transform } from "class-transformer";
import { AnalyticsEventType } from "src/common/enums";

export class AdminAnalyticsQueryDto {
  @IsOptional()
  @IsNumber()
  dateFrom?: number;

  @IsOptional()
  @IsNumber()
  dateTo?: number;

  @IsOptional()
  @IsEnum(AnalyticsEventType)
  eventType?: AnalyticsEventType;

  @IsOptional()
  @IsString()
  userId?: string;
}

export class AdminTopLinksQueryDto {
  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(value) : 10))
  @IsNumber()
  @Min(1)
  limit?: number = 10;

  @IsOptional()
  @IsNumber()
  dateFrom?: number;

  @IsOptional()
  @IsNumber()
  dateTo?: number;
}
