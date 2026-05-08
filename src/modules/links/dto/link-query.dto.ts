import {
  IsOptional,
  IsString,
  IsNumber,
  Min,
  IsBoolean,
  IsEnum,
} from "class-validator";
import { Transform } from "class-transformer";
import { LinkType } from "src/common/enums";

export class LinkQueryDto {
  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(value) : 1))
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(value) : 10))
  @IsNumber()
  @Min(1)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(LinkType)
  linkType?: LinkType;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return undefined;
  })
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  sortBy?: string = "orderIndex";

  @IsOptional()
  @IsString()
  sortOrder?: "ASC" | "DESC" = "ASC";

  @IsOptional()
  @IsNumber()
  dateFrom?: number;

  @IsOptional()
  @IsNumber()
  dateTo?: number;
}
