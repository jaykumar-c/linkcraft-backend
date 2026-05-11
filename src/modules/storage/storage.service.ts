import {
  Injectable,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { v2 as cloudinary, UploadApiResponse } from "cloudinary";

import { CloudinaryProvider } from "./providers/cloudinary.provider";
import { validateFile, validateBulkFiles, sanitizeFilename, getFileExtension } from "./helpers/file.helper";
import { STORAGE_MAX_FILE_SIZE, STORAGE_MAX_BULK_FILES } from "./constants/storage.constants";
import { StorageErrorMessage } from "./enums/storage.enums";
import { UploadSingleDto, DeleteFileDto, DownloadFileDto, FileMetadata, FailedUpload, BulkUploadResponse } from "./dto/storage.dto";

const DEFAULT_FOLDER = "linkcraft";

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  constructor(
    private cloudinaryProvider: CloudinaryProvider,
    private configService: ConfigService,
  ) {}

  async uploadSingle(file: Express.Multer.File, dto: UploadSingleDto): Promise<FileMetadata> {
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

    const validation = validateFile({ originalname: file.originalname, mimetype: file.mimetype, size: file.size });
    if (!validation.isValid) {
      throw new BadRequestException({
        errorCode: validation.errorCode,
        message: validation.error,
      });
    }

    try {
      const sanitizedName = sanitizeFilename(file.originalname);
      const folder = DEFAULT_FOLDER;

      const uploadOptions = {
        folder,
        public_id: sanitizedName.replace(/\.[^/.]+$/, ""),
        resource_type: "auto" as const,
        use_filename: true,
        unique_filename: true,
      };

      const result = await this.cloudinaryProvider.uploadStream(file.buffer, uploadOptions);

      return this.mapToFileMetadata(file, result);
    } catch (error) {
      this.logger.error(`Upload failed: ${error}`);
      throw new BadRequestException({
        errorCode: "STG003",
        message: StorageErrorMessage.UPLOAD_FAILED,
      });
    }
  }

  async uploadBulk(files: Express.Multer.File[], dto: UploadSingleDto): Promise<BulkUploadResponse> {
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
        return await this.uploadSingle(file, dto);
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
        message: StorageErrorMessage.BULK_UPLOAD_ALL_FAILED,
      });
    }

    if (failed.length > 0) {
      this.logger.warn(`${failed.length} files failed to upload`);
    }

    return { uploaded, failed };
  }

  async deleteFile(dto: DeleteFileDto): Promise<{ success: boolean }> {
    if (!dto.publicId) {
      throw new BadRequestException({
        errorCode: "STG008",
        message: "publicId is required",
      });
    }

    try {
      await this.cloudinaryProvider.destroy(dto.publicId);
      return { success: true };
    } catch (error) {
      throw new BadRequestException({
        errorCode: "STG009",
        message: StorageErrorMessage.DELETE_FAILED,
      });
    }
  }

  async generateDownloadUrl(publicId: string, expiresIn?: string): Promise<string> {
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
        message: StorageErrorMessage.GENERATE_URL_FAILED,
      });
    }
  }

  private mapToFileMetadata(file: Express.Multer.File, result: UploadApiResponse): FileMetadata {
    return {
      publicId: result.public_id,
      secureUrl: result.secure_url,
      originalName: file.originalname,
      mimeType: result.format ? `image/${result.format}` : file.mimetype,
      size: result.bytes,
      extension: getFileExtension(file.originalname),
      uploadedAt: new Date(result.created_at),
    };
  }
}