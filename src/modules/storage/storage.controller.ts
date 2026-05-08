import {
  Controller,
  Post,
  Delete,
  Get,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  HttpCode,
  HttpStatus,
  UploadedFiles,
  UploadedFile,
} from "@nestjs/common";
import { FileFieldsInterceptor, FileInterceptor } from "@nestjs/platform-express";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { User } from "../users/entities/user.entity";
import { StorageService } from "./storage.service";
import { UploadSingleDto } from "./dto/upload-single.dto";
import { DeleteFileDto, DownloadFileDto } from "./dto/storage.dto";
import { createMulterModuleOptions } from "./config/multer.config";

@Controller("storage")
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post("upload")
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor("file", createMulterModuleOptions()))
  @HttpCode(HttpStatus.CREATED)
  async uploadSingle(
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: UploadSingleDto,
  ) {
    const result = await this.storageService.uploadSingle(file, body);
    return {
      message: "FILE_UPLOADED_SUCCESSFULLY",
      errorCode: "STORAGE100",
      data: result,
    };
  }

  @Post("upload/bulk")
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileFieldsInterceptor([{ name: "files", maxCount: 10 }], createMulterModuleOptions()))
  @HttpCode(HttpStatus.CREATED)
  async uploadBulk(
    @CurrentUser() user: User,
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: UploadSingleDto,
  ) {
    const result = await this.storageService.uploadBulk(files, body);
    return {
      message: result.failed.length > 0 ? "SOME_FILES_UPLOADED" : "FILES_UPLOADED_SUCCESSFULLY",
      errorCode: result.failed.length > 0 ? "STORAGE101" : "STORAGE100",
      data: result,
    };
  }

  @Delete("file")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async deleteFile(
    @CurrentUser() user: User,
    @Body() body: DeleteFileDto,
  ) {
    const result = await this.storageService.deleteFile(body);
    return {
      message: "FILE_DELETED_SUCCESSFULLY",
      errorCode: "STORAGE200",
      data: result,
    };
  }

  @Get("download")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async downloadFile(
    @CurrentUser() user: User,
    @Query() query: DownloadFileDto,
  ) {
    const { publicId, expiresIn } = query;
    if (!publicId) {
      return {
        message: "publicId is required",
        errorCode: "STORAGE300",
        data: null,
      };
    }

    const url = await this.storageService.generateDownloadUrl(publicId, expiresIn);
    return {
      message: "URL_GENERATED_SUCCESSFULLY",
      errorCode: "STORAGE300",
      data: { url },
    };
  }
}