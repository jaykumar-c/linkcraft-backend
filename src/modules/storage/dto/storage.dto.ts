import { IsOptional, IsString, IsNumberString, IsNotEmpty } from "class-validator";
import { Transform } from "class-transformer";

export class UploadSingleDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === "string" ? value : undefined))
  folder?: string;

  @IsOptional()
  @IsString()
  tags?: string;
}

export class DeleteFileDto {
  @IsString()
  @IsNotEmpty()
  id: string;
}

export class DownloadFileDto {
  @IsString()
  @IsNotEmpty()
  publicId: string;

  @IsOptional()
  @IsNumberString()
  expiresIn?: string;
}

export class BulkUploadResponse {
  uploaded: FileMetadata[];
  failed: FailedUpload[];
}

export class FileMetadata {
  id: string;
  publicId: string;
  secureUrl: string;
  originalName: string;
  mimeType: string;
  size: number;
  sizeMb: number;
  extension: string;
  uploadedAt: Date;
}

export class FailedUpload {
  originalName: string;
  error: string;
}