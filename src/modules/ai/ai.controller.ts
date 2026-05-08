import { Controller, Post, Get, Body, UseGuards, Res, Header } from "@nestjs/common";
import { Response } from "express";
import { AiService } from "./ai.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { User } from "../users/entities/user.entity";
import { UsersService } from "../users/users.service";
import { LinksService } from "../links/links.service";

/**
 * AI Controller - Handles AI bio generation endpoints
 * All routes require JWT authentication
 */
@Controller("api/v1/ai")
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly usersService: UsersService,
    private readonly linksService: LinksService,
  ) {}

  /**
   * POST /api/v1/ai/generate
   * Generate bio with streaming response (SSE)
   * Accepts Vercel AI SDK message format
   */
  @Post("generate")
  @Header("Cache-Control", "no-cache")
  async generate(
    @CurrentUser() user: User,
    @Body() body: any,
    @Res() res: Response,
  ) {
    // Parse request body
    const lastMessage = body.messages?.[body.messages?.length - 1];
    const prompt = lastMessage?.content || body.customPrompt;
    const tone = body.tone || "professional";
    const length = body.length || "medium";
    const includeLinks = body.includeLinks !== false;

    // Get user profile and links for context
    const userProfile: any = await this.usersService.getProfile(user.id);
    const userLinks = await this.linksService.getPublicLinks(user.username);
    const links = (userLinks as any).data || [];

    // Delegate to service for streaming response
    await this.aiService.generateBioStream(
      res,
      user.id,
      { displayName: userProfile.display_name, profession: userProfile.profession },
      links.map((l: any) => ({ title: l.title, url: l.url, category: l.category })),
      { customPrompt: prompt, tone, length, includeLinks },
    );
  }

  /**
   * GET /api/v1/ai/history
   * Get user's generation history
   */
  @Get("history")
  async getHistory(@CurrentUser() user: User) {
    const generations = await this.aiService.getUserGenerationHistory(user.id);

    return {
      message: "History fetched",
      errorCode: "HISTORY_FETCHED",
      data: generations,
    };
  }

  /**
   * POST /api/v1/ai/apply
   * Apply a generation to user's profile
   */
  @Post("apply")
  async applyToProfile(
    @CurrentUser() user: User,
    @Body() body: { generationId: string },
  ) {
    await this.aiService.applyGenerationToProfile(user.id, body.generationId);

    return {
      message: "Bio applied to profile",
      errorCode: "BIO_APPLIED",
      data: null,
    };
  }
}