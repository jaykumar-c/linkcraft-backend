import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Response } from "express";
import { streamText, LanguageModel } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { GenerateBioDto } from "./dto/generate-bio.dto";
import { AiGeneration } from "./entities/ai-generation.entity";
import { BioPromptBuilder } from "./prompts/bio-prompt.builder";
import { AiTone, AiLength, AiGenerationStatus } from "src/common/enums";
import { UsersService } from "../users/users.service";
import { cleanAiBioResponse } from "src/common/helpers/clean-ai-response.helper";
import { UserProfileInput } from "src/common/interfaces";
import {
  GROQ_AI_MODELS,
  SORT_ORDER_TYPE,
} from "src/common/config/constants/common.constants";

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private groqClient: ReturnType<typeof createGroq>;

  constructor(
    private configService: ConfigService,
    @InjectRepository(AiGeneration)
    private aiGenerationRepository: Repository<AiGeneration>,
    private bioPromptBuilder: BioPromptBuilder,
    private usersService: UsersService,
  ) {
    // Initialize Groq client with API key from config
    const groqApiKey = this.configService.get<string>("GROQ_API_KEY");
    if (groqApiKey) {
      this.groqClient = createGroq({
        apiKey: groqApiKey,
      });
    }
  }

  async generateBioStream(
    res: Response,
    userId: string,
    userProfile: UserProfileInput,
    userLinks: Array<{ title: string; url: string; category: string | null }>,
    dto: GenerateBioDto,
  ): Promise<void> {
    const model =
      this.configService.get<string>("GROQ_MODEL") || GROQ_AI_MODELS.DEFAULT;
    const groqApiKey = this.configService.get<string>("GROQ_API_KEY");

    // Validate Groq configuration
    if (!groqApiKey || !this.groqClient) {
      res.write(
        `data: ${JSON.stringify({ error: "AI service not configured" })}\n\n`,
      );
      res.end();
      return;
    }

    // Build prompt based on user input or custom prompt
    let prompt: { system: string; user: string };
    let userPromptText = dto.customPrompt || "";

    // If includeLinks is true and user has links, add them to the prompt
    if (dto.includeLinks !== false && userLinks.length > 0) {
      const linkTexts = userLinks
        .slice(0, 3)
        .map((l: any) => `${l.title}: ${l.url}`)
        .join(", ");
      userPromptText += `\n\nMy links (include in bio if relevant): ${linkTexts}`;
    }

    if (dto.customPrompt) {
      // Use user's custom prompt directly (with links if enabled)
      prompt = {
        system:
          "You are a personal branding copywriter. Write a compelling, concise bio (2-3 sentences) based on the user's information.",
        user: userPromptText,
      };
    } else {
      // Build prompt using the builder
      const built = this.bioPromptBuilder.build({
        profile: userProfile,
        links: userLinks.filter((l) => l.category !== null) as any,
        keywords: [],
        includeLinks: dto.includeLinks !== false ? "true" : "false",
        tone: dto.tone || AiTone.PROFESSIONAL,
        length: dto.length || AiLength.MEDIUM,
      });
      prompt = { system: built.system, user: built.user };
    }

    // Set SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keepalive");
    res.setHeader("Access-Control-Allow-Origin", "*");

    try {
      // Stream response using Vercel AI SDK
      const stream = await streamText({
        model: this.groqClient(model) as unknown as LanguageModel,
        system: prompt.system,
        messages: [{ role: "user" as const, content: prompt.user }],
      });

      let fullText = "";

      // Stream each chunk to client in real-time
      for await (const chunk of stream.textStream) {
        fullText += chunk;
        res.write(
          `data: ${JSON.stringify({ role: "assistant", content: chunk })}\n\n`,
        );
      }

      // Save generation to database after completion
      const cleanedResponse = cleanAiBioResponse(fullText);

      await this.aiGenerationRepository.save({
        userId,
        prompt: `${prompt.system}\n\n${prompt.user}`,
        response: cleanedResponse,
        model,
        tone: dto.tone || AiTone.PROFESSIONAL,
        length: dto.length || AiLength.MEDIUM,
        status: AiGenerationStatus.COMPLETED,
        tokensTotal: fullText.length,
      });

      // Update user's total token usage
      await this.usersService.incrementTokenUsage(userId, fullText.length);

      // Send done signal
      res.write(
        `data: ${JSON.stringify({ role: "assistant", content: "[DONE]" })}\n\n`,
      );
      res.end();
    } catch (error) {
      this.logger.error("Stream error:", error);
      res.write(`data: ${JSON.stringify({ error: "Generation failed" })}\n\n`);
      res.end();
    }
  }

  async getUserGenerationHistory(userId: string): Promise<AiGeneration[]> {
    return this.aiGenerationRepository.find({
      where: { userId },
      order: { createdAt: SORT_ORDER_TYPE.DESC },
      take: 50,
    });
  }

  async applyGenerationToProfile(
    userId: string,
    generationId: string,
  ): Promise<void> {
    const generation = await this.aiGenerationRepository.findOne({
      where: { id: generationId, userId },
    });

    if (!generation || !generation.response) {
      throw new NotFoundException({
        errorCode: "AIC001",
        message: "Generation not found or has no response.",
      });
    }

    // Mark as applied
    await this.aiGenerationRepository.update(generationId, {
      wasApplied: true,
    });
  }
}
