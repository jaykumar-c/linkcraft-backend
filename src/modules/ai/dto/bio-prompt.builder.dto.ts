import { IsNotEmpty, IsArray, IsString, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class LinkInputDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  url: string;

  @IsString()
  @IsOptional()
  category?: string;
}

export class UserProfileInputDto {
  @IsString()
  @IsOptional()
  displayName?: string;

  @IsString()
  @IsOptional()
  profession?: string;
}

export class BioBuildOptions {
  @ValidateNested()
  @Type(() => UserProfileInputDto)
  @IsOptional()
  profile?: UserProfileInputDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LinkInputDto)
  @IsOptional()
  links?: LinkInputDto[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  keywords?: string[];

  @IsString()
  @IsOptional()
  includeLinks?: string = 'true';

  @IsString()
  @IsOptional()
  tone?: string = 'professional';

  @IsString()
  @IsOptional()
  length?: string = 'medium';
}

export interface PromptResult {
  system: string;
  user: string;
}