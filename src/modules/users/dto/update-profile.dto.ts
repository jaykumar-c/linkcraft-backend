import { IsOptional, IsString, MaxLength } from "class-validator";

/**
 * DTO for updating user profile information.
 * All fields are optional to allow partial updates.
 */
export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  username?: string;

  @IsOptional()
  @IsString()
  bioText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  profession?: string;

  @IsOptional()
  avatar_url?: string;
}