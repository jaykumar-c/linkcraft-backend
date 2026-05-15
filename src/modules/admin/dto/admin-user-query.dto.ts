import {
  IsOptional,
  IsString,
  IsNumber,
  Min,
  IsBoolean,
  IsEnum,
} from "class-validator";
import { Transform } from "class-transformer";
import { UserPlan, UserRole } from "src/common/enums";

export class AdminUserQueryDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(value) : 1))
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(value) : 20))
  @IsNumber()
  @Min(1)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(UserPlan)
  plan?: UserPlan;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === "true") return true;
    if (value === "false") return false;
    return undefined;
  })
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  sortBy?: string = "createdAt";

  @IsOptional()
  @IsString()
  sortOrder?: "ASC" | "DESC" = "DESC";

  @IsOptional()
  @IsNumber()
  dateFrom?: number;

  @IsOptional()
  @IsNumber()
  dateTo?: number;
}
