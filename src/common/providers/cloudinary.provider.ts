import { Injectable, OnModuleInit, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  v2 as cloudinary,
  UploadApiResponse,
  DeleteApiResponse,
  ResourceApiResponse,
} from "cloudinary";
import { UploadOptions } from "src/common/interfaces";

@Injectable()
export class CloudinaryProvider implements OnModuleInit {
  private readonly logger = new Logger(CloudinaryProvider.name);

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const cloudName = this.configService.get<string>("CLOUDINARY_CLOUD_NAME");
    const apiKey = this.configService.get<string>("CLOUDINARY_API_KEY");
    const apiSecret = this.configService.get<string>("CLOUDINARY_API_SECRET");

    if (!cloudName || !apiKey || !apiSecret) {
      this.logger.warn(
        "Cloudinary credentials are not fully configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in environment variables.",
      );
      return;
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });

    this.logger.log("Cloudinary configured successfully");
  }

  getCloudinaryInstance() {
    return cloudinary;
  }

  async uploadStream(
    buffer: Buffer,
    options: UploadOptions = {},
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        options as any,
        (error, result) => {
          if (error) {
            reject(error);
          } else if (result) {
            resolve(result as UploadApiResponse);
          } else {
            reject(new Error("Unexpected upload error"));
          }
        },
      );

      uploadStream.end(buffer);
    });
  }

  async destroy(publicId: string): Promise<DeleteApiResponse> {
    return cloudinary.uploader.destroy(publicId) as Promise<DeleteApiResponse>;
  }

  async getResource(publicId: string): Promise<ResourceApiResponse> {
    return cloudinary.api.resource(publicId) as Promise<ResourceApiResponse>;
  }

  async generateSignedUrl(
    publicId: string,
    options: { expires_at?: number; resource_type?: string } = {},
  ): Promise<string> {
    const timestamp = Math.round(new Date().getTime() / 1000);
    return cloudinary.url(publicId, {
      secure: true,
      sign_timestamp: timestamp,
      ...options,
    }) as string;
  }
}
