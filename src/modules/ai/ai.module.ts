import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { BioPromptBuilder } from 'src/common/prompts/ai/bio-prompt.builder';
import { AiRateLimitGuard } from 'src/common/guards/ai-rate-limit.guard';
import { AiGeneration } from './entities/ai-generation.entity';
import { LinksModule } from '../links/links.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([AiGeneration]),
    LinksModule,
    UsersModule,
  ],
  controllers: [AiController],
  providers: [AiService, BioPromptBuilder, AiRateLimitGuard],
  exports: [AiService],
})
export class AiModule {}