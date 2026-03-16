import { Injectable } from '@nestjs/common'
import { ScoringService } from '../../../scoring/scoring.service'
import { AmoCrmWritebackService } from '../../../amo-integration/services/amo-crm-writeback/amo-crm-writeback.service'
import { buildScoringNote } from '../../../amo-integration/utils/build-scoring-note'
import { AmoCrmCandidateCreatedDto } from '../../dto/amocrm-candidate-created.dto'

@Injectable()
export class AmoCrmWebhooksService {
  constructor(
    private readonly scoringService: ScoringService,
    private readonly amoCrmWritebackService: AmoCrmWritebackService,
  ) {}

  async handleCandidateCreated(dto: AmoCrmCandidateCreatedDto) {
    const scoringResult = await this.scoringService.runScoringByAmoLead({
      accountId: dto.accountId,
      amoLeadId: dto.amoLeadId,
    })

    const hardFilterPassed = !!scoringResult?.hardFilterResult?.passed

    const aiScore =
      scoringResult?.aiScoringResult?.score !== undefined
        ? scoringResult.aiScoringResult.score
        : null

    const scoringStatus = !hardFilterPassed
      ? 'hard_rejected'
      : 'scored'

    const hardFilterStatus = hardFilterPassed ? 'passed' : 'failed'

    const noteText = buildScoringNote({
      status: scoringStatus,
      score: aiScore,
      summary: scoringResult?.aiScoringResult?.summary ?? scoringResult?.message,
      reasons: scoringResult?.aiScoringResult?.reasons ?? [],
      strengths: scoringResult?.aiScoringResult?.strengths ?? [],
      weaknesses: scoringResult?.aiScoringResult?.weaknesses ?? [],
      hardRejectReason: scoringResult?.hardFilterResult?.reason ?? null,
      autoRejectStatus: 'not triggered',
    })

    const writebackResult =
      await this.amoCrmWritebackService.writeScoringResult({
        accountId: dto.accountId,
        amoLeadId: dto.amoLeadId,
        fields: {
          aiScore,
          aiScoringStatus: scoringStatus,
          aiHardFilterStatus: hardFilterStatus,
          aiLastScoredAt: new Date().toISOString(),
        },
        noteText,
      })

    return {
      message: 'Webhook processed successfully',
      triggered: true,
      scoringResult,
      writebackResult,
    }
  }
}