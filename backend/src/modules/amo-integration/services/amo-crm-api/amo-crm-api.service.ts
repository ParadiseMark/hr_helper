import { Injectable, InternalServerErrorException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { HttpService } from '@nestjs/axios'
import { firstValueFrom } from 'rxjs'
import { LogsService } from '../../../logs/logs.service'

@Injectable()
export class AmoCrmApiService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly logsService: LogsService,
  ) {}

  private get baseUrl() {
    const value = this.configService.get<string>('AMOCRM_BASE_URL')

    if (!value) {
      throw new InternalServerErrorException('AMOCRM_BASE_URL is not set')
    }

    return value
  }

  private get accessToken() {
    const value = this.configService.get<string>('AMOCRM_ACCESS_TOKEN')

    if (!value) {
      throw new InternalServerErrorException('AMOCRM_ACCESS_TOKEN is not set')
    }

    return value
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
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
    const url = `${this.baseUrl}/api/v4/leads/${amoLeadId}`

    const payload = {
      custom_fields_values: customFieldsValues,
    }

    try {
      const response = await firstValueFrom(
        this.httpService.patch(url, payload, {
          headers: this.headers,
        }),
      )

      await this.logsService.createApiLog({
        accountId,
        provider: 'amocrm',
        action: 'lead.update.custom-fields',
        requestJson: {
          amoLeadId,
          payload,
        },
        responseJson: response.data,
        status: 'success',
      })

      return response.data
    } catch (error: any) {
      await this.logsService.createApiLog({
        accountId,
        provider: 'amocrm',
        action: 'lead.update.custom-fields',
        requestJson: {
          amoLeadId,
          payload,
        },
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
    const url = `${this.baseUrl}/api/v4/leads/notes`

    const payload = [
      {
        entity_id: Number(amoLeadId),
        note_type: 'common',
        params: {
          text: noteText,
        },
      },
    ]

    try {
      const response = await firstValueFrom(
        this.httpService.post(url, payload, {
          headers: this.headers,
        }),
      )

      await this.logsService.createApiLog({
        accountId,
        provider: 'amocrm',
        action: 'lead.create.note',
        requestJson: {
          amoLeadId,
          payload,
        },
        responseJson: response.data,
        status: 'success',
      })

      return response.data
    } catch (error: any) {
      await this.logsService.createApiLog({
        accountId,
        provider: 'amocrm',
        action: 'lead.create.note',
        requestJson: {
          amoLeadId,
          payload,
        },
        responseJson: {
          message: error?.message ?? 'Unknown amoCRM error',
          response: error?.response?.data ?? null,
        },
        status: 'error',
      })

      throw error
    }
  }
}