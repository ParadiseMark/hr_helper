import { Injectable, Logger, Optional } from '@nestjs/common'
import { AmoOAuthService } from '../amo-integration/services/amo-oauth/amo-oauth.service'
import { AmoCrmApiService } from '../amo-integration/services/amo-crm-api/amo-crm-api.service'
import { AmoFieldProvisionerService } from '../amo-integration/services/amo-field-provisioner/amo-field-provisioner.service'
import { HhOAuthService } from '../hh-integration/services/hh-oauth.service'

@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name)

  constructor(
    private readonly amoOAuthService: AmoOAuthService,
    private readonly amoCrmApiService: AmoCrmApiService,
    private readonly amoFieldProvisioner: AmoFieldProvisionerService,
    @Optional() private readonly hhOAuthService?: HhOAuthService,
  ) {}

  getAmoCrmAuthUrl(accountId: string) {
    const url = this.amoOAuthService.getAuthUrl(accountId)
    return { authUrl: url }
  }

  async handleAmoCrmCallback(code: string, accountId: string, referer?: string) {
    await this.amoOAuthService.exchangeCode(code, accountId, referer ?? '')

    // Provision fields after successful OAuth
    try {
      await this.amoFieldProvisioner.provisionFields(accountId)
    } catch (err: any) {
      this.logger.warn(`Field provisioning failed for account ${accountId}: ${err?.message}`)
    }

    return { message: 'amoCRM integration connected successfully' }
  }

  async provisionFields(accountId: string) {
    const fields = await this.amoFieldProvisioner.provisionFields(accountId)
    return { message: 'Fields provisioned', fields }
  }

  async getPipelines(accountId: string) {
    return this.amoCrmApiService.getPipelines(accountId)
  }

  async getUsers(accountId: string) {
    return this.amoCrmApiService.getUsers(accountId)
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
