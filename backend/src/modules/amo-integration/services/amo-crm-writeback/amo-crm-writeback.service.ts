import { Injectable } from '@nestjs/common'
import { AmoCrmApiService } from '../amo-crm-api/amo-crm-api.service'
import { AmoFieldProvisionerService } from '../amo-field-provisioner/amo-field-provisioner.service'
import { AmoCrmWritebackPayload } from '../../types/amo-writeback.types'

@Injectable()
export class AmoCrmWritebackService {
  constructor(
    private readonly amoCrmApiService: AmoCrmApiService,
    private readonly amoFieldProvisioner: AmoFieldProvisionerService,
  ) {}

  async writeScoringResult(payload: AmoCrmWritebackPayload) {
    const amoFields = await this.amoFieldProvisioner.getFields(payload.accountId)
    if (!amoFields) {
      throw new Error(`amoCRM fields not provisioned for account ${payload.accountId}`)
    }

    const customFieldsValues = [
      {
        field_id: amoFields.aiScore,
        values: [{ value: payload.fields.aiScore ?? 0 }],
      },
      {
        field_id: amoFields.aiStatus,
        values: [{ value: payload.fields.aiScoringStatus }],
      },
      {
        field_id: amoFields.hardFilterStatus,
        values: [{ value: payload.fields.aiHardFilterStatus }],
      },
      {
        field_id: amoFields.lastScoredAt,
        values: [{ value: Math.floor(new Date(payload.fields.aiLastScoredAt).getTime() / 1000) }],
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