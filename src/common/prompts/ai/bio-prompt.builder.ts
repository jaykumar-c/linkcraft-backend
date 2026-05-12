import { Injectable } from '@nestjs/common';
import { AiTone } from 'src/common/enums';

interface PromptTemplateResult {
  system: string;
  user: string;
}

interface LinkInput {
  title: string;
  url: string;
  category?: string | null;
}

interface ScrapedLinkInput {
  title: string;
  url: string;
  content: string;
}

interface UserProfileInput {
  displayName?: string;
  profession?: string;
}

interface BioBuildOptions {
  profile?: UserProfileInput;
  links?: LinkInput[];
  scrapedLinks?: ScrapedLinkInput[];
  keywords?: string[];
  includeLinks?: string;
  tone?: string;
  length?: string;
}

interface ToneTemplate {
  getSystemPrompt(): string;
}

@Injectable()
export class BioPromptBuilder {
  private readonly toneTemplates: Record<string, ToneTemplate> = {
    professional: {
      getSystemPrompt: () => `You are an expert personal branding copywriter. 
Generate a professional, authoritative bio that highlights expertise and credibility.
Tone: Confident, polished, industry-appropriate.
Avoid: Slang, emojis, overly casual language.
Focus on: Professional achievements, skills, and value proposition.`,
    },
    casual: {
      getSystemPrompt: () => `You are a friendly personal branding copywriter.
Generate a warm, approachable bio that feels conversational and authentic.
Tone: Friendly, relatable, like talking to a colleague.
Use: First person, contractions, personal touches.
Avoid: Corporate jargon, stiff formalities.`,
    },
    humorous: {
      getSystemPrompt: () => `You are a witty personal branding copywriter.
Generate a bio with personality and humor while remaining professional enough for a public profile.
Tone: Playful, clever, self-aware.
Use: Light humor, puns (if natural), relatable observations.
Avoid: Offensive jokes, excessive sarcasm, unprofessional content.`,
    },
    minimalist: {
      getSystemPrompt: () => `You are a concise personal branding copywriter.
Generate an ultra-concise, impactful bio using as few words as possible while conveying maximum meaning.
Tone: Direct, punchy, memorable.
Use: Short sentences, strong verbs, no filler.
Avoid: Adjectives, adverbs, unnecessary words.`,
    },
  };

  build(options: BioBuildOptions): PromptTemplateResult {
    const tone = options.tone || AiTone.PROFESSIONAL;
    const template =
      this.toneTemplates[tone] || this.toneTemplates.professional;

    const systemPrompt = template.getSystemPrompt();

    const profile = options.profile || {};
    const name = profile.displayName || 'User';
    const profession = profile.profession || AiTone.PROFESSIONAL;

    const linksSection =
      options.includeLinks !== 'false' && options.links?.length
        ? `\nLinks:\n${options.links.map((l) => `- ${l.title} (${l.category || 'link'}): ${l.url}`).join('\n')}`
        : '';

    const scrapedSection =
      options.includeLinks !== 'false' && options.scrapedLinks?.length
        ? `\nLink Details (scraped from user's pages):\n${options.scrapedLinks.map(
            (s) => `--- ${s.title} (${s.url}) ---\n${s.content}\n---`,
          ).join('\n')}`
        : '';

    const keywordsSection = options.keywords?.length
      ? `\nKeywords: ${options.keywords.join(', ')}`
      : '';

    const userPrompt = `
    User Profile:
    - Name: ${name}
    - Profession: ${profession}
    ${keywordsSection}
    ${linksSection}
    ${scrapedSection}

    Generate a ${options.length || 'medium'} bio that reflects the user's professional identity. Incorporate the keywords naturally if provided. Use the scraped link content to understand the user's work, projects, and style — reference specific details from their pages.${options.includeLinks !== 'false' && options.links?.length ? ' Reference their links to show their work/projects.' : ''}
    `.trim();

    return { system: systemPrompt, user: userPrompt };
  }

  getMaxTokensForLength(length: string): number {
    switch (length) {
      case 'short':
        return 100;
      case 'medium':
        return 200;
      case 'long':
        return 400;
      default:
        return 200;
    }
  }
}
