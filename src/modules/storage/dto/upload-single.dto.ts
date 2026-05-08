import { IsOptional, IsString } from "class-validator";
import { Transform } from "class-transformer";

export class UploadSingleDto {
  @IsOptional()
  @IsString()
  tags?: string;
}