import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Res,
  Header,
  Query,
} from "@nestjs/common";
import { Response } from "express";
import { AiService } from "./ai.service";
import { JwtAuthGuard, AiRateLimitGuard } from "../../common/guards";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { User } from "../users/entities/user.entity";
import { UsersService } from "../users/users.service";
import { LinksService } from "../links/links.service";
import { AiLength, AiTone } from "src/common/enums";

@Controller("ai")
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly usersService: UsersService,
    private readonly linksService: LinksService,
  ) {}

  @Post("generate")
  @UseGuards(AiRateLimitGuard)
  @Header("Cache-Control", "no-cache")
  async generate(
    @CurrentUser() user: User,
    @Body() body: any,
    @Res() res: Response,
  ) {
    const lastMessage = body.messages?.[body.messages?.length - 1];
    const prompt = lastMessage?.content || body.customPrompt;
    const validTones = Object.values(AiTone);
    const tone = validTones.includes(body.tone) ? body.tone : AiTone.PROFESSIONAL;
    const validLengths = Object.values(AiLength);
    const length = validLengths.includes(body.length) ? body.length : AiLength.MEDIUM;
    const includeLinks = body.includeLinks !== false;

    const userProfile: any = await this.usersService.getProfile(user.id);
    const links = await this.linksService.getUserLinks(user.id);

    await this.aiService.generateBioStream(
      res,
      user.id,
      {
        displayName: userProfile.display_name,
        profession: userProfile.profession,
      },
      links.map((l: any) => ({
        title: l.title,
        url: l.url,
        category: l.category,
      })),
      { customPrompt: prompt, tone, length, includeLinks },
    );
  }

  @Get("history")
  async getHistory(
    @CurrentUser() user: User,
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 8,
  ) {
    return this.aiService.getUserGenerationHistory(user.id, page, limit);
  }

  @Post("apply")
  async applyToProfile(
    @CurrentUser() user: User,
    @Body() body: { generationId: string },
  ) {
    await this.aiService.applyGenerationToProfile(user.id, body.generationId);
    return {
      message: "Bio applied to profile",
      errorCode: "AIC002",
      data: {},
      error: "",
    };
  }
}
