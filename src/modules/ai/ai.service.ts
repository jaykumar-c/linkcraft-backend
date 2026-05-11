import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
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

/**
 * Clean AI response - remove prefixes and trailing questions
 */
function cleanAiBioResponse(text: string): string {
  if (!text) return "";
  
  let cleaned = text;
  
  // Remove quotes at start/end
  cleaned = cleaned.replace(/^["']+|["']+$/g, '');
  
  // Remove AI prefixes (case insensitive)
  cleaned = cleaned.replace(/^here'?s?\s*(a\s*)?(possible\s*)?bio:?[\s\n]*/i, '');
  cleaned = cleaned.replace(/^here'?s?\s*your\s*bio:?[\s\n]*/i, '');
  cleaned = cleaned.replace(/^here'?s?\s*\w+\s*bio\s*for\s*you:?[\s\n]*/i, '');
  cleaned = cleaned.replace(/^sure[!,.]*\s*/i, '');
  cleaned = cleaned.replace(/^of\s*course[!,.]*\s*/i, '');
  cleaned = cleaned.replace(/^certainly[!,.]*\s*/i, '');
  cleaned = cleaned.replace(/^absolutely[!,.]*\s*/i, '');
  cleaned = cleaned.replace(/^no\s*problem[!,.]*\s*/i, '');
  
  // Remove ending questions like "Would you like me to modify..."
  cleaned = cleaned.replace(/\n{0,2}(would you like me to|would you|can i|shall i).*$/i, '');
  
  // Clean up extra whitespace and newlines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  cleaned = cleaned.trim();
  
  return cleaned;
}

/**
 * User profile input interface
 */
interface UserProfileInput {
  displayName?: string;
  profession?: string;
}

/**
 * AI Service - Handles all AI bio generation operations
 * Uses Vercel AI SDK with Groq provider for streaming responses
 */
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

  /**
   * Generate bio with streaming response (SSE)
   * Writes chunks directly to response stream for real-time UI updates
   * 
   * @param res - Express response object for streaming
   * @param userId - Current user ID
   * @param userProfile - User profile data
   * @param userLinks - User's links for context
   * @param dto - Generation settings (tone, length, customPrompt, etc.)
   */
  async generateBioStream(
    res: Response,
    userId: string,
    userProfile: UserProfileInput,
    userLinks: Array<{ title: string; url: string; category: string | null }>,
    dto: GenerateBioDto,
  ): Promise<void> {
    const model = this.configService.get<string>("GROQ_MODEL") || "llama-3.1-70b-versatile";
    const groqApiKey = this.configService.get<string>("GROQ_API_KEY");

    // Validate Groq configuration
    if (!groqApiKey || !this.groqClient) {
      res.write(`data: ${JSON.stringify({ error: "AI service not configured" })}\n\n`);
      res.end();
      return;
    }

    // Build prompt based on user input or custom prompt
    let prompt: { system: string; user: string };
    let userPromptText = dto.customPrompt || "";
    
    // If includeLinks is true and user has links, add them to the prompt
    if (dto.includeLinks !== false && userLinks.length > 0) {
      const linkTexts = userLinks.slice(0, 3).map((l: any) => `${l.title}: ${l.url}`).join(", ");
      userPromptText += `\n\nMy links (include in bio if relevant): ${linkTexts}`;
    }
    
    if (dto.customPrompt) {
      // Use user's custom prompt directly (with links if enabled)
      prompt = {
        system: "You are a personal branding copywriter. Write a compelling, concise bio (2-3 sentences) based on the user's information.",
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
        res.write(`data: ${JSON.stringify({ role: "assistant", content: chunk })}\n\n`);
      }

      // Save generation to database after completion
      const cleanedResponse = cleanAiBioResponse(fullText);
      
      const generation = await this.aiGenerationRepository.save({
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
      res.write(`data: ${JSON.stringify({ role: "assistant", content: "[DONE]" })}\n\n`);
      res.end();
    } catch (error) {
      this.logger.error("Stream error:", error);
      res.write(`data: ${JSON.stringify({ error: "Generation failed" })}\n\n`);
      res.end();
    }
  }

  /**
   * Get user's generation history
   * @param userId - Current user ID
   * @returns Array of past generations
   */
  async getUserGenerationHistory(userId: string): Promise<AiGeneration[]> {
    return this.aiGenerationRepository.find({
      where: { userId },
      order: { createdAt: "DESC" },
      take: 50,
    });
  }

  /**
   * Apply a generated bio to user's profile
   * @param userId - Current user ID
   * @param generationId - Generation to apply
   */
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