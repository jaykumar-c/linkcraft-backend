import { Module } from "@nestjs/common";
import { MulterModule } from "@nestjs/platform-express";
import { TypeOrmModule } from "@nestjs/typeorm";
import { StorageController } from "./storage.controller";
import { StorageService } from "./storage.service";
import { CloudinaryProvider } from "../../common/providers/cloudinary.provider";
import { createMulterModuleOptions } from "../../config/multer.config";
import { Media } from "./entities/media.entity";

@Module({
  imports: [
    MulterModule.register(createMulterModuleOptions()),
    TypeOrmModule.forFeature([Media]),
  ],
  controllers: [StorageController],
  providers: [StorageService, CloudinaryProvider],
  exports: [StorageService, CloudinaryProvider],
})
export class StorageModule {}
