import { Injectable, BadRequestException, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { v2 as cloudinary, UploadApiResponse } from "cloudinary";

import { CloudinaryProvider } from "../../common/providers/cloudinary.provider";
import {
  validateFile,
  validateBulkFiles,
  sanitizeFilename,
  getFileExtension,
} from "../../common/helpers/file.helper";
import {
  STORAGE_MAX_FILE_SIZE,
  STORAGE_MAX_BULK_FILES,
  DEFAULT_STORAGE_FOLDER,
} from "../../common/config/constants/common.constants";
import {
  UploadSingleDto,
  FileMetadata,
  FailedUpload,
  BulkUploadResponse,
} from "./dto/storage.dto";
import { Media } from "./entities/media.entity";

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  constructor(
    private cloudinaryProvider: CloudinaryProvider,
    @InjectRepository(Media)
    private mediaRepository: Repository<Media>,
  ) {}

  async uploadSingle(
    file: Express.Multer.File,
    dto: UploadSingleDto,
    userId: string,
  ): Promise<FileMetadata> {
    if (!file) {
      throw new BadRequestException({
        errorCode: "STG001",
        message: "No file provided",
      });
    }

    if (file.size > STORAGE_MAX_FILE_SIZE) {
      throw new BadRequestException({
        errorCode: "STG002",
        message: `File size exceeds the maximum allowed size of ${STORAGE_MAX_FILE_SIZE / (1024 * 1024)}MB`,
      });
    }

    const validation = validateFile({
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    });
    if (!validation.isValid) {
      throw new BadRequestException({
        errorCode: validation.errorCode,
        message: validation.error,
      });
    }

    try {
      const sanitizedName = sanitizeFilename(file.originalname);
      const folder = DEFAULT_STORAGE_FOLDER;

      const uploadOptions = {
        folder,
        public_id: sanitizedName.replace(/\.[^/.]+$/, ""),
        resource_type: "auto" as const,
        use_filename: true,
        unique_filename: true,
      };

      const result = await this.cloudinaryProvider.uploadStream(
        file.buffer,
        uploadOptions,
      );

      const media = this.mediaRepository.create({
        publicId: result.public_id,
        secureUrl: result.secure_url,
        userId,
        originalName: file.originalname,
        mimeType: file.mimetype,
        sizeMb: parseFloat((result.bytes / (1024 * 1024)).toFixed(2)),
        extension: getFileExtension(file.originalname),
      });
      const saved = await this.mediaRepository.save(media);

      return this.mapToFileMetadata(file, result, saved);
    } catch (error) {
      this.logger.error(`Upload failed: ${error}`);
      throw new BadRequestException({
        errorCode: "STG003",
        message: "Upload failed",
      });
    }
  }

  async uploadBulk(
    files: Express.Multer.File[],
    dto: UploadSingleDto,
    userId: string,
  ): Promise<BulkUploadResponse> {
    if (!files || files.length === 0) {
      throw new BadRequestException({
        errorCode: "STG004",
        message: "No files provided",
      });
    }

    for (const file of files) {
      if (file.size > STORAGE_MAX_FILE_SIZE) {
        throw new BadRequestException({
          errorCode: "STG005",
          message: `File ${file.originalname} exceeds the maximum allowed size of ${STORAGE_MAX_FILE_SIZE / (1024 * 1024)}MB`,
        });
      }
    }

    if (files.length > STORAGE_MAX_BULK_FILES) {
      throw new BadRequestException({
        errorCode: "STG006",
        message: `Maximum ${STORAGE_MAX_BULK_FILES} files allowed`,
      });
    }

    const validation = validateBulkFiles(files);
    if (!validation.isValid) {
      throw new BadRequestException({
        errorCode: validation.errorCode,
        message: validation.error,
      });
    }

    const uploaded: FileMetadata[] = [];
    const failed: FailedUpload[] = [];

    const uploadPromises = files.map(async (file) => {
      try {
        return await this.uploadSingle(file, dto, userId);
      } catch (error) {
        return {
          success: false,
          originalName: file.originalname,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    });

    const results = await Promise.allSettled(uploadPromises);

    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        const value = result.value;
        if ("success" in value && !value.success) {
          failed.push({
            originalName: value.originalName,
            error: value.error,
          });
        } else {
          uploaded.push(value as FileMetadata);
        }
      } else {
        failed.push({
          originalName: files[index].originalname,
          error: result.reason?.message || "Unknown error",
        });
      }
    });

    if (failed.length > 0 && uploaded.length === 0) {
      throw new BadRequestException({
        errorCode: "STG007",
        message: "Bulk upload failed",
      });
    }

    if (failed.length > 0) {
      this.logger.warn(`${failed.length} files failed to upload`);
    }

    return { uploaded, failed };
  }

  async deleteFile(id: string, userId: string): Promise<{ success: boolean }> {
    const media = await this.mediaRepository.findOne({
      where: { id, userId },
    });

    if (!media) {
      throw new BadRequestException({
        errorCode: "STG008",
        message: "File not found",
      });
    }

    try {
      await this.cloudinaryProvider.destroy(media.publicId);

      await this.mediaRepository.query(
        `UPDATE users SET avatar_media_id = NULL WHERE avatar_media_id = $1`,
        [media.id],
      );

      await this.mediaRepository.remove(media);

      return { success: true };
    } catch (error) {
      throw new BadRequestException({
        errorCode: "STG009",
        message: "Delete failed",
      });
    }
  }

  async generateDownloadUrl(
    publicId: string,
    expiresIn?: string,
  ): Promise<string> {
    if (!publicId) {
      throw new BadRequestException({
        errorCode: "STG010",
        message: "publicId is required",
      });
    }

    try {
      const timestamp = Math.round(new Date().getTime() / 1000);
      const expiration = expiresIn ? parseInt(expiresIn) : 3600;

      const signedUrl = cloudinary.url(publicId, {
        secure: true,
        sign_timestamp: timestamp,
        resource_type: "auto",
        type: "upload",
        expires_at: timestamp + expiration,
      });

      if (!signedUrl) {
        throw new Error("Failed to generate URL");
      }

      return signedUrl;
    } catch (error) {
      throw new BadRequestException({
        errorCode: "STG011",
        message: "Failed to generate URL",
      });
    }
  }

  private mapToFileMetadata(
    file: Express.Multer.File,
    result: UploadApiResponse,
    media: Media,
  ): FileMetadata {
    return {
      id: media.id,
      publicId: result.public_id,
      secureUrl: result.secure_url,
      originalName: file.originalname,
      mimeType: result.format ? `image/${result.format}` : file.mimetype,
      size: result.bytes,
      sizeMb: media.sizeMb,
      extension: getFileExtension(file.originalname),
      uploadedAt: new Date(result.created_at),
    };
  }
}
