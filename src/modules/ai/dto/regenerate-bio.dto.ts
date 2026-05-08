import { IsEnum, IsOptional, IsArray, IsString, ArrayMaxSize } from 'class-validator';

import { AiTone, AiLength } from 'src/common/enums';

export class RegenerateBioDto {
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10)
  @IsOptional()
  keywords?: string[];

  @IsEnum(AiTone)
  @IsOptional()
  tone?: AiTone;

  @IsEnum(AiLength)
  @IsOptional()
  length?: AiLength;
}