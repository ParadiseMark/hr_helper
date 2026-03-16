import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { AmoCrmApiService } from '../amo-crm-api/amo-crm-api.service'
import { AmoCrmWritebackPayload } from '../../types/amo-writeback.types'

@Injectable()
export class AmoCrmWritebackService {
  constructor(
    private readonly configService: ConfigService,
    private readonly amoCrmApiService: AmoCrmApiService,
  ) {}

  async writeScoringResult(payload: AmoCrmWritebackPayload) {
    const aiScoreFieldId = Number(
      this.configService.get<string>('AMOCRM_FIELD_AI_SCORE_ID'),
    )

    const aiScoringStatusFieldId = Number(
      this.configService.get<string>('AMOCRM_FIELD_AI_SCORING_STATUS_ID'),
    )

    const aiHardFilterStatusFieldId = Number(
      this.configService.get<string>('AMOCRM_FIELD_AI_HARD_FILTER_STATUS_ID'),
    )

    const aiLastScoredAtFieldId = Number(
      this.configService.get<string>('AMOCRM_FIELD_AI_LAST_SCORED_AT_ID'),
    )

    const customFieldsValues = [
      {
        field_id: aiScoreFieldId,
        values: [
          {
            value: payload.fields.aiScore ?? 0,
          },
        ],
      },
      {
        field_id: aiScoringStatusFieldId,
        values: [
          {
            value: payload.fields.aiScoringStatus,
          },
        ],
      },
      {
        field_id: aiHardFilterStatusFieldId,
        values: [
          {
            value: payload.fields.aiHardFilterStatus,
          },
        ],
      },
      {
        field_id: aiLastScoredAtFieldId,
        values: [
          {
            value: Math.floor(new Date(payload.fields.aiLastScoredAt).getTime() / 1000),
          },
        ],
      },
    ]

    const updateFieldsResult =
      await this.amoCrmApiService.updateLeadCustomFields(
        payload.accountId,
        payload.amoLeadId,
        customFieldsValues,
      )

    const createNoteResult = await this.amoCrmApiService.createLeadNote(
      payload.accountId,
      payload.amoLeadId,
      payload.noteText,
    )

    return {
      message: 'amoCRM writeback completed',
      updateFieldsResult,
      createNoteResult,
    }
  }
}