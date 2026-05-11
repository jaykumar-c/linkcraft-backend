import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { User } from "../users/entities/user.entity";
import { LinksService } from "./links.service";
import { CreateLinkDto } from "./dto/create-link.dto";
import { UpdateLinkDto } from "./dto/update-link.dto";
import { LinkQueryDto } from "./dto/link-query.dto";
import { ReorderLinksDto } from "./dto/reorder-links.dto";
import { BulkOperationDto } from "./dto/bulk-operation.dto";
import { LinkDetailsQueryDto } from "./dto/link-details-query.dto";

@Controller("links")
export class LinksController {
  constructor(private readonly linksService: LinksService) {}

  @UseGuards(JwtAuthGuard)
  @Post("create")
  @HttpCode(HttpStatus.CREATED)
  async createLink(
    @CurrentUser() user: User,
    @Body() body: CreateLinkDto,
  ) {
    const result = await this.linksService.createLink(user.id, body);
    return {
      message: 'Link created successfully',
      errorCode: 'LNC001',
      data: result,
      error: '',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Patch("update")
  @HttpCode(HttpStatus.OK)
  async updateLink(
    @CurrentUser() user: User,
    @Body() body: UpdateLinkDto & { linkId: string },
  ) {
    const { linkId, ...updateData } = body;
    const result = await this.linksService.updateLink(user.id, linkId, updateData);
    return {
      message: 'Link updated successfully',
      errorCode: 'LNC002',
      data: result,
      error: '',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Delete("delete")
  @HttpCode(HttpStatus.OK)
  async deleteLink(
    @CurrentUser() user: User,
    @Body() body: { linkId: string },
  ) {
    await this.linksService.deleteLink(user.id, body.linkId);
    return {
      message: 'Link deleted successfully',
      errorCode: 'LNC003',
      data: {},
      error: '',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post("restore")
  @HttpCode(HttpStatus.OK)
  async restoreLink(
    @CurrentUser() user: User,
    @Body() body: { linkId: string },
  ) {
    const result = await this.linksService.restoreLink(user.id, body.linkId);
    return {
      message: 'Link restored successfully',
      errorCode: 'LNC004',
      data: result,
      error: '',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get("details")
  @HttpCode(HttpStatus.OK)
  async getLinkDetails(
    @CurrentUser() user: User,
    @Query() query: LinkDetailsQueryDto,
  ) {
    const result = await this.linksService.getLinkDetails(user.id, query);
    return {
      message: '',
      errorCode: 'LNC005',
      data: result,
      error: '',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get("list")
  @HttpCode(HttpStatus.OK)
  async listLinks(
    @CurrentUser() user: User,
    @Query() query: LinkQueryDto,
  ) {
    const result = await this.linksService.listLinks(user.id, query);
    return {
      message: '',
      errorCode: 'LNC006',
      data: result,
      error: '',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post("reorder")
  @HttpCode(HttpStatus.OK)
  async reorderLinks(
    @CurrentUser() user: User,
    @Body() body: ReorderLinksDto,
  ) {
    await this.linksService.reorderLinks(user.id, body);
    return {
      message: 'Links reordered successfully',
      errorCode: 'LNC007',
      data: {},
      error: '',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Patch("toggle-status")
  @HttpCode(HttpStatus.OK)
  async toggleLinkStatus(
    @CurrentUser() user: User,
    @Body() body: { linkId: string; isActive: boolean },
  ) {
    const result = await this.linksService.toggleLinkStatus(
      user.id,
      body.linkId,
      body.isActive,
    );
    return {
      message: 'Link status toggled successfully',
      errorCode: 'LNC008',
      data: result,
      error: '',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post("bulk-operation")
  @HttpCode(HttpStatus.OK)
  async bulkOperation(
    @CurrentUser() user: User,
    @Body() body: BulkOperationDto,
  ) {
    const result = await this.linksService.bulkOperation(user.id, body);
    return {
      message: 'Bulk operation completed successfully',
      errorCode: 'LNC009',
      data: result,
      error: '',
    };
  }

  // ─── Public APIs ────────────────────────────────────────────────────────────

  @Get("public")
  @HttpCode(HttpStatus.OK)
  async getPublicLinks(@Query("username") username: string) {
    if (!username) {
      return {
        message: '',
        errorCode: 'LNC010',
        data: {},
        error: 'Username is required',
      };
    }
    const result = await this.linksService.getPublicLinks(username);
    return {
      message: '',
      errorCode: 'LNC011',
      data: result,
      error: '',
    };
  }
}