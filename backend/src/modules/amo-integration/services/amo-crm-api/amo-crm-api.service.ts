import { Injectable, Logger } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { firstValueFrom } from 'rxjs'
import { LogsService } from '../../../logs/logs.service'
import { AmoOAuthService } from '../amo-oauth/amo-oauth.service'

@Injectable()
export class AmoCrmApiService {
  private readonly logger = new Logger(AmoCrmApiService.name)

  constructor(
    private readonly httpService: HttpService,
    private readonly logsService: LogsService,
    private readonly amoOAuthService: AmoOAuthService,
  ) {}

  private async getAuthHeaders(accountId: string) {
    const tokens = await this.amoOAuthService.getValidTokens(accountId)
    return {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
        'Content-Type': 'application/json',
      },
      baseUrl: tokens.baseUrl,
    }
  }

  async updateLeadCustomFields(
    accountId: string,
    amoLeadId: string,
    customFieldsValues: Array<{
      field_id: number
      values: Array<{ value: string | number }>
    }>,
  ) {
    const { headers, baseUrl } = await this.getAuthHeaders(accountId)
    const url = `${baseUrl}/api/v4/leads/${amoLeadId}`
    const payload = { custom_fields_values: customFieldsValues }

    try {
      const response = await firstValueFrom(
        this.httpService.patch(url, payload, { headers, timeout: 10000 }),
      )

      await this.logsService.createApiLog({
        accountId,
        provider: 'amocrm',
        action: 'lead.update.custom-fields',
        requestJson: { amoLeadId, payload },
        responseJson: response.data,
        status: 'success',
      })

      return response.data
    } catch (error: any) {
      await this.logsService.createApiLog({
        accountId,
        provider: 'amocrm',
        action: 'lead.update.custom-fields',
        requestJson: { amoLeadId, payload },
        responseJson: {
          message: error?.message ?? 'Unknown amoCRM error',
          response: error?.response?.data ?? null,
        },
        status: 'error',
      })
      throw error
    }
  }

  async createLeadNote(
    accountId: string,
    amoLeadId: string,
    noteText: string,
  ) {
    const { headers, baseUrl } = await this.getAuthHeaders(accountId)
    const url = `${baseUrl}/api/v4/leads/notes`

    const payload = [
      {
        entity_id: Number(amoLeadId),
        note_type: 'common',
        params: { text: noteText },
      },
    ]

    try {
      const response = await firstValueFrom(
        this.httpService.post(url, payload, { headers, timeout: 10000 }),
      )

      await this.logsService.createApiLog({
        accountId,
        provider: 'amocrm',
        action: 'lead.create.note',
        requestJson: { amoLeadId, payload },
        responseJson: response.data,
        status: 'success',
      })

      return response.data
    } catch (error: any) {
      await this.logsService.createApiLog({
        accountId,
        provider: 'amocrm',
        action: 'lead.create.note',
        requestJson: { amoLeadId, payload },
        responseJson: {
          message: error?.message ?? 'Unknown amoCRM error',
          response: error?.response?.data ?? null,
        },
        status: 'error',
      })
      throw error
    }
  }

  async createOrUpdateLead(
    accountId: string,
    leadData: {
      name: string
      customFieldsValues?: Array<{
        field_id: number
        values: Array<{ value: string | number }>
      }>
    },
    existingLeadId?: string,
  ) {
    const { headers, baseUrl } = await this.getAuthHeaders(accountId)

    if (existingLeadId) {
      const url = `${baseUrl}/api/v4/leads/${existingLeadId}`
      const payload: any = {}
      if (leadData.name) payload.name = leadData.name
      if (leadData.customFieldsValues) payload.custom_fields_values = leadData.customFieldsValues

      const response = await firstValueFrom(
        this.httpService.patch(url, payload, { headers, timeout: 10000 }),
      )

      await this.logsService.createApiLog({
        accountId,
        provider: 'amocrm',
        action: 'lead.update',
        requestJson: { existingLeadId, payload },
        responseJson: response.data,
        status: 'success',
      })

      return response.data
    }

    const url = `${baseUrl}/api/v4/leads`
    const payload = [
      {
        name: leadData.name,
        custom_fields_values: leadData.customFieldsValues ?? [],
      },
    ]

    const response = await firstValueFrom(
      this.httpService.post(url, payload, { headers, timeout: 10000 }),
    )

    await this.logsService.createApiLog({
      accountId,
      provider: 'amocrm',
      action: 'lead.create',
      requestJson: { payload },
      responseJson: response.data,
      status: 'success',
    })

    return response.data
  }
}