import { Module } from "@nestjs/common";
import { MulterModule } from "@nestjs/platform-express";
import { StorageController } from "./storage.controller";
import { StorageService } from "./storage.service";
import { CloudinaryProvider } from "./providers/cloudinary.provider";
import { createMulterModuleOptions } from "./config/multer.config";

@Module({
  imports: [
    MulterModule.register(createMulterModuleOptions()),
  ],
  controllers: [StorageController],
  providers: [StorageService, CloudinaryProvider],
  exports: [StorageService, CloudinaryProvider],
})
export class StorageModule {}