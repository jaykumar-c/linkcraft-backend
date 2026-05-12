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
  UploadedFile,
  UploadedFiles,
} from "@nestjs/common";
import {
  FileFieldsInterceptor,
  FileInterceptor,
} from "@nestjs/platform-express";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { User } from "../users/entities/user.entity";
import { StorageService } from "./storage.service";
import { UploadSingleDto } from "./dto/upload-single.dto";
import { DeleteFileDto, DownloadFileDto } from "./dto/storage.dto";
import { createMulterModuleOptions } from "../../config/multer.config";

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
    const result = await this.storageService.uploadSingle(file, body, user.id);
    return {
      message: "File uploaded successfully",
      errorCode: "STC001",
      data: result,
      error: "",
    };
  }

  @Post("upload/bulk")
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileFieldsInterceptor(
      [{ name: "files", maxCount: 10 }],
      createMulterModuleOptions(),
    ),
  )
  @HttpCode(HttpStatus.CREATED)
  async uploadBulk(
    @CurrentUser() user: User,
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: UploadSingleDto,
  ) {
    const result = await this.storageService.uploadBulk(files, body, user.id);
    return {
      message:
        result.failed.length > 0
          ? "Some files uploaded"
          : "Files uploaded successfully",
      errorCode: result.failed.length > 0 ? "STC002" : "STC001",
      data: result,
      error: "",
    };
  }

  @Delete("file")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async deleteFile(@CurrentUser() user: User, @Query() query: DeleteFileDto) {
    const result = await this.storageService.deleteFile(query.id, user.id);
    return {
      message: "File deleted successfully",
      errorCode: "STC003",
      data: result,
      error: "",
    };
  }

  @Get("download")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async downloadFile(
    @CurrentUser() user: User,
    @Query() query: DownloadFileDto,
  ) {
    if (!query.publicId) {
      return {
        message: "",
        errorCode: "VAL001",
        data: {},
        error: "publicId is required",
      };
    }
    const url = await this.storageService.generateDownloadUrl(
      query.publicId,
      query.expiresIn,
    );
    return {
      message: "",
      errorCode: "STC004",
      data: { url },
      error: "",
    };
  }
}
