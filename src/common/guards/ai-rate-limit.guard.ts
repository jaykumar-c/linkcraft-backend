import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';

@Injectable()
export class AiRateLimitGuard implements CanActivate {
  private readonly logger = new Logger(AiRateLimitGuard.name);

  constructor(
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
    private readonly configService: ConfigService,
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

    const [aiResult, aiContentResult] = await Promise.all([
      this.entityManager.query(
        `SELECT COUNT(*)::int AS cnt FROM ai_generations WHERE user_id = $1 AND created_at > $2`,
        [userId, todayTimestamp],
      ),
      this.entityManager.query(
        `SELECT COUNT(*)::int AS cnt FROM ai_content_generations WHERE user_id = $1 AND created_at > $2`,
        [userId, todayTimestamp],
      ),
    ]);

    const totalCount = (aiResult[0]?.cnt ?? 0) + (aiContentResult[0]?.cnt ?? 0);
    const limit = this.configService.get<number>('AI_RATE_LIMIT_REQUESTS', 10);

    if (totalCount >= limit) {
      throw new HttpException(
        {
          errorCode: 'AI004',
          message: `Daily AI generation limit reached (${limit}).`,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
