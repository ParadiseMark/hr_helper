import { Injectable } from '@nestjs/common'
import { AmoOAuthService } from '../amo-integration/services/amo-oauth/amo-oauth.service'
import { AmoCrmApiService } from '../amo-integration/services/amo-crm-api/amo-crm-api.service'

@Injectable()
export class IntegrationsService {
  constructor(
    private readonly amoOAuthService: AmoOAuthService,
    private readonly amoCrmApiService: AmoCrmApiService,
  ) {}

  getAmoCrmAuthUrl(accountId: string) {
    const url = this.amoOAuthService.getAuthUrl(accountId)
    return { authUrl: url }
  }

  async handleAmoCrmCallback(code: string, accountId: string, referer?: string) {
    await this.amoOAuthService.exchangeCode(code, accountId, referer ?? '')
    return { message: 'amoCRM integration connected successfully' }
  }

  async getStatus(accountId: string) {
    const amocrm = await this.amoOAuthService.getIntegrationStatus(accountId)
    return { accountId, integrations: { amocrm } }
  }

  async createTestLead(accountId: string, name: string) {
    const result = await this.amoCrmApiService.createOrUpdateLead(accountId, { name })
    return { message: 'Test lead created in amoCRM', result }
  }
}