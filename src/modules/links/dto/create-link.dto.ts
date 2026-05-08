import {
  IsString,
  IsUrl,
  IsOptional,
  MaxLength,
  IsEnum,
  IsBoolean,
  IsNumber,
  Min,
  IsInt,
} from "class-validator";
import { LinkType } from "src/common/enums";

export class CreateLinkDto {
  @IsString()
  @MaxLength(150)
  title: string;

  @IsUrl({ require_tld: false })
  url: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  iconUrl?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  thumbnailUrl?: string;

  @IsOptional()
  @IsEnum(LinkType)
  linkType?: LinkType;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  displayOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  scheduleStartAt?: number;

  @IsOptional()
  @IsNumber()
  scheduleEndAt?: number;
}
