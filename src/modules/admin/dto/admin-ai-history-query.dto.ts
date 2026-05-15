import {
  IsOptional,
  IsString,
  IsNumber,
  Min,
  IsEnum,
} from "class-validator";
import { Transform } from "class-transformer";
import { AiTone, AiGenerationStatus } from "src/common/enums";

export class AdminAiHistoryQueryDto {
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
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsEnum(AiGenerationStatus)
  status?: AiGenerationStatus;

  @IsOptional()
  @IsEnum(AiTone)
  tone?: AiTone;

  @IsOptional()
  @IsNumber()
  dateFrom?: number;

  @IsOptional()
  @IsNumber()
  dateTo?: number;
}
