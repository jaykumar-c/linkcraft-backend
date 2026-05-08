import {
  IsString,
  IsOptional,
  IsEnum,
  MaxLength,
} from "class-validator";
import { AnalyticsEventType } from "src/common/enums";

export class CreateAnalyticsDto {
  @IsString()
  linkId: string;

  @IsOptional()
  @IsEnum(AnalyticsEventType)
  eventType?: AnalyticsEventType;

  @IsOptional()
  @IsString()
  userAgent?: string;

  @IsOptional()
  @IsString()
  referrer?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2)
  countryCode?: string;

  @IsOptional()
  @IsString()
  countryName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  deviceType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  browser?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  os?: string;

  @IsOptional()
  @IsString()
  ipHash?: string;

  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsOptional()
  @IsString()
  uniqueClickId?: string;
}
