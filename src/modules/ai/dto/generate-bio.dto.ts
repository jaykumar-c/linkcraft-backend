import { IsString, IsEnum, IsOptional, IsArray, IsBoolean, IsUUID, ArrayMaxSize, MaxLength } from 'class-validator';

import { AiTone, AiLength } from 'src/common/enums';

export class GenerateBioDto {
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10)
  @IsOptional()
  keywords?: string[];

  @IsEnum(AiTone)
  @IsOptional()
  tone?: AiTone = AiTone.PROFESSIONAL;

  @IsEnum(AiLength)
  @IsOptional()
  length?: AiLength = AiLength.MEDIUM;

  @IsBoolean()
  @IsOptional()
  includeLinks?: boolean = true;

  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  selectedLinkIds?: string[];

  @IsString()
  @IsOptional()
  @MaxLength(500)
  customPrompt?: string;
}