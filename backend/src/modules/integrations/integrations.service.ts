import { Injectable, Optional } from '@nestjs/common'
import { AmoOAuthService } from '../amo-integration/services/amo-oauth/amo-oauth.service'
import { AmoCrmApiService } from '../amo-integration/services/amo-crm-api/amo-crm-api.service'
import { HhOAuthService } from '../hh-integration/services/hh-oauth.service'

@Injectable()
export class IntegrationsService {
  constructor(
    private readonly amoOAuthService: AmoOAuthService,
    private readonly amoCrmApiService: AmoCrmApiService,
    @Optional() private readonly hhOAuthService?: HhOAuthService,
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
    const hh = this.hhOAuthService
      ? await this.hhOAuthService.getIntegrationStatus(accountId)
      : { connected: false, provider: 'hh' }
    return { accountId, integrations: { amocrm, hh } }
  }

  async createTestLead(accountId: string, name: string) {
    const result = await this.amoCrmApiService.createOrUpdateLead(accountId, { name })
    return { message: 'Test lead created in amoCRM', result }
  }
}