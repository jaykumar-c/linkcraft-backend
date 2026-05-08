import {
  IsString,
  IsOptional,
  IsNumber,
  Min,
  IsEnum,
} from "class-validator";
import { AnalyticsEventType } from "src/common/enums";

export class LinkAnalyticsQueryDto {
  @IsString()
  linkId: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number = 50;

  @IsOptional()
  @IsEnum(AnalyticsEventType)
  eventType?: AnalyticsEventType;

  @IsOptional()
  @IsString()
  countryCode?: string;

  @IsOptional()
  @IsString()
  deviceType?: string;

  @IsOptional()
  @IsNumber()
  dateFrom?: number;

  @IsOptional()
  @IsNumber()
  dateTo?: number;
}
