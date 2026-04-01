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
      pipelineId?: string | null
      statusId?: string | null
      responsibleUserId?: string | null
      customFieldsValues?: Array<{
        field_id: number
        values: Array<{ value: string | number }>
      }>
      contactIds?: number[]
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
    const leadPayload: any = {
      name: leadData.name,
      custom_fields_values: leadData.customFieldsValues ?? [],
    }
    if (leadData.pipelineId) leadPayload.pipeline_id = Number(leadData.pipelineId)
    if (leadData.statusId) leadPayload.status_id = Number(leadData.statusId)
    if (leadData.responsibleUserId) leadPayload.responsible_user_id = Number(leadData.responsibleUserId)
    if (leadData.contactIds?.length) {
      leadPayload._embedded = { contacts: leadData.contactIds.map(id => ({ id })) }
    }

    const response = await firstValueFrom(
      this.httpService.post(url, [leadPayload], { headers, timeout: 10000 }),
    )

    await this.logsService.createApiLog({
      accountId,
      provider: 'amocrm',
      action: 'lead.create',
      requestJson: { leadPayload },
      responseJson: response.data,
      status: 'success',
    })

    return response.data
  }

  async createContact(
    accountId: string,
    contactData: {
      name: string
      phone?: string | null
      email?: string | null
      customFieldsValues?: Array<{
        field_id: number
        values: Array<{ value: string | number }>
      }>
    },
  ) {
    const { headers, baseUrl } = await this.getAuthHeaders(accountId)
    const url = `${baseUrl}/api/v4/contacts`

    const payload: any = { name: contactData.name, custom_fields_values: [] }

    if (contactData.phone) {
      payload.custom_fields_values.push({
        field_code: 'PHONE',
        values: [{ value: contactData.phone, enum_code: 'WORK' }],
      })
    }
    if (contactData.email) {
      payload.custom_fields_values.push({
        field_code: 'EMAIL',
        values: [{ value: contactData.email, enum_code: 'WORK' }],
      })
    }
    if (contactData.customFieldsValues?.length) {
      payload.custom_fields_values.push(...contactData.customFieldsValues)
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post(url, [payload], { headers, timeout: 10000 }),
      )

      await this.logsService.createApiLog({
        accountId,
        provider: 'amocrm',
        action: 'contact.create',
        requestJson: { payload },
        responseJson: response.data,
        status: 'success',
      })

      return response.data?._embedded?.contacts?.[0] ?? null
    } catch (error: any) {
      await this.logsService.createApiLog({
        accountId,
        provider: 'amocrm',
        action: 'contact.create',
        requestJson: { payload },
        responseJson: { message: error?.message, response: error?.response?.data },
        status: 'error',
      })
      throw error
    }
  }

  async getPipelines(accountId: string) {
    const { headers, baseUrl } = await this.getAuthHeaders(accountId)
    const url = `${baseUrl}/api/v4/leads/pipelines?with=statuses`
    const response = await firstValueFrom(
      this.httpService.get(url, { headers, timeout: 10000 }),
    )
    return response.data?._embedded?.pipelines ?? []
  }

  async getUsers(accountId: string) {
    const { headers, baseUrl } = await this.getAuthHeaders(accountId)
    const url = `${baseUrl}/api/v4/users`
    const response = await firstValueFrom(
      this.httpService.get(url, { headers, timeout: 10000 }),
    )
    return response.data?._embedded?.users ?? []
  }

  async getLeadCustomFields(accountId: string) {
    const { headers, baseUrl } = await this.getAuthHeaders(accountId)
    const url = `${baseUrl}/api/v4/leads/custom_fields`
    const response = await firstValueFrom(
      this.httpService.get(url, { headers, timeout: 10000 }),
    )
    return response.data?._embedded?.custom_fields ?? []
  }

  async getContactCustomFields(accountId: string) {
    const { headers, baseUrl } = await this.getAuthHeaders(accountId)
    const url = `${baseUrl}/api/v4/contacts/custom_fields`
    const response = await firstValueFrom(
      this.httpService.get(url, { headers, timeout: 10000 }),
    )
    return response.data?._embedded?.custom_fields ?? []
  }

  async createLeadCustomField(
    accountId: string,
    field: { name: string; field_type: string; is_api_only?: boolean },
  ) {
    const { headers, baseUrl } = await this.getAuthHeaders(accountId)
    const url = `${baseUrl}/api/v4/leads/custom_fields`
    const payload = [{ name: field.name, field_type: field.field_type, is_api_only: field.is_api_only ?? true }]
    const response = await firstValueFrom(
      this.httpService.post(url, payload, { headers, timeout: 10000 }),
    )
    return response.data?._embedded?.custom_fields?.[0] ?? null
  }

  async createContactCustomField(
    accountId: string,
    field: { name: string; field_type: string; is_api_only?: boolean },
  ) {
    const { headers, baseUrl } = await this.getAuthHeaders(accountId)
    const url = `${baseUrl}/api/v4/contacts/custom_fields`
    const payload = [{ name: field.name, field_type: field.field_type, is_api_only: field.is_api_only ?? true }]
    const response = await firstValueFrom(
      this.httpService.post(url, payload, { headers, timeout: 10000 }),
    )
    return response.data?._embedded?.custom_fields?.[0] ?? null
  }

  async attachFileToLeadNote(
    accountId: string,
    amoLeadId: string,
    fileBuffer: Buffer,
    filename: string,
    mimeType: string = 'application/pdf',
  ) {
    const { headers, baseUrl } = await this.getAuthHeaders(accountId)

    // Upload file first
    const uploadUrl = `${baseUrl}/api/v4/leads/${amoLeadId}/files`
    const FormData = require('form-data')
    const form = new FormData()
    form.append('file', fileBuffer, { filename, contentType: mimeType })

    try {
      const uploadResponse = await firstValueFrom(
        this.httpService.post(uploadUrl, form, {
          headers: { ...headers, ...form.getHeaders() },
          timeout: 30000,
        }),
      )

      const fileId = uploadResponse.data?._embedded?.files?.[0]?.id
      if (!fileId) return null

      // Create note with file
      const noteUrl = `${baseUrl}/api/v4/leads/notes`
      const notePayload = [{
        entity_id: Number(amoLeadId),
        note_type: 'attachment',
        params: { file_uuid: fileId, file_name: filename },
      }]

      const noteResponse = await firstValueFrom(
        this.httpService.post(noteUrl, notePayload, { headers, timeout: 10000 }),
      )

      return noteResponse.data
    } catch (error: any) {
      this.logger.warn(`Failed to attach file to lead ${amoLeadId}: ${error?.message}`)
      return null
    }
  }
}