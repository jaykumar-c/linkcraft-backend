import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { AiGeneration } from '../entities/ai-generation.entity';

@Injectable()
export class AiRateLimitGuard implements CanActivate {
  private readonly logger = new Logger(AiRateLimitGuard.name);

  constructor(
    @InjectRepository(AiGeneration)
    private aiGenerationRepository: Repository<AiGeneration>,
    private configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;

    if (!userId) {
      return true;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = Math.floor(today.getTime() / 1000);

    const count = await this.aiGenerationRepository.count({
      where: {
        userId,
        createdAt: MoreThan(todayTimestamp),
      },
    });

    const limit = this.configService.get<number>('AI_RATE_LIMIT_REQUESTS', 10);

    if (count >= limit) {
      throw new HttpException(
        {
          errorCode: 'AI004',
          message: `Daily AI generation limit reached (${limit}). Upgrade to Pro for more.`,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}