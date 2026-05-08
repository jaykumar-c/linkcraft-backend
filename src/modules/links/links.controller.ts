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
  Request,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
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
    return this.linksService.createLink(user.id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Patch("update")
  @HttpCode(HttpStatus.OK)
  async updateLink(
    @CurrentUser() user: User,
    @Body() body: UpdateLinkDto & { linkId: string },
  ) {
    const { linkId, ...updateData } = body;
    return this.linksService.updateLink(user.id, linkId, updateData);
  }

  @UseGuards(JwtAuthGuard)
  @Delete("delete")
  @HttpCode(HttpStatus.OK)
  async deleteLink(
    @CurrentUser() user: User,
    @Body() body: { linkId: string },
  ) {
    return this.linksService.deleteLink(user.id, body.linkId);
  }

  @UseGuards(JwtAuthGuard)
  @Post("restore")
  @HttpCode(HttpStatus.OK)
  async restoreLink(
    @CurrentUser() user: User,
    @Body() body: { linkId: string },
  ) {
    return this.linksService.restoreLink(user.id, body.linkId);
  }

  @UseGuards(JwtAuthGuard)
  @Get("details")
  @HttpCode(HttpStatus.OK)
  async getLinkDetails(
    @CurrentUser() user: User,
    @Query() query: LinkDetailsQueryDto,
  ) {
    return this.linksService.getLinkDetails(user.id, query);
  }

  @UseGuards(JwtAuthGuard)
  @Get("list")
  @HttpCode(HttpStatus.OK)
  async listLinks(
    @CurrentUser() user: User,
    @Query() query: LinkQueryDto,
  ) {
    return this.linksService.listLinks(user.id, query);
  }

  @UseGuards(JwtAuthGuard)
  @Post("reorder")
  @HttpCode(HttpStatus.OK)
  async reorderLinks(
    @CurrentUser() user: User,
    @Body() body: ReorderLinksDto,
  ) {
    return this.linksService.reorderLinks(user.id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Patch("toggle-status")
  @HttpCode(HttpStatus.OK)
  async toggleLinkStatus(
    @CurrentUser() user: User,
    @Body() body: { linkId: string; isActive: boolean },
  ) {
    return this.linksService.toggleLinkStatus(
      user.id,
      body.linkId,
      body.isActive,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post("bulk-operation")
  @HttpCode(HttpStatus.OK)
  async bulkOperation(
    @CurrentUser() user: User,
    @Body() body: BulkOperationDto,
  ) {
    return this.linksService.bulkOperation(user.id, body);
  }

  // ─── Public APIs ────────────────────────────────────────────────────────────

  @Get("public")
  @HttpCode(HttpStatus.OK)
  async getPublicLinks(@Query("username") username: string) {
    if (!username) {
      return {
        message: "Username is required",
        errorCode: "LINK_PUBLIC_001",
        data: null,
      };
    }
    return this.linksService.getPublicLinks(username);
  }
}
