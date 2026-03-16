import { Module } from '@nestjs/common'
import { ScoringController } from './scoring.controller'
import { ScoringService } from './scoring.service'
import { HardFilterService } from './services/hard-filter.service'
import { AiScoringService } from './services/ai-scoring.service'
import { ScoringOrchestratorService } from './services/scoring-orchestrator.service'
import { LogsModule } from '../logs/logs.module'

@Module({
  imports: [LogsModule],
  controllers: [ScoringController],
  providers: [
    ScoringService,
    HardFilterService,
    AiScoringService,
    ScoringOrchestratorService,
  ],
  exports: [ScoringService],
})
export class ScoringModule {}