import { Injectable, Logger, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { HttpService } from '@nestjs/axios'
import { firstValueFrom } from 'rxjs'
import { PrismaService } from '../../../../prisma/prisma.service'
import { LogsService } from '../../../logs/logs.service'

interface AmoTokenResponse {
  token_type: string
  expires_in: number
  access_token: string
  refresh_token: string
}

export interface AmoTokens {
  accessToken: string
  baseUrl: string
}

@Injectable()
export class AmoOAuthService {
  private readonly logger = new Logger(AmoOAuthService.name)

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
    private readonly logsService: LogsService,
  ) {}

  private get clientId(): string {
    return this.configService.getOrThrow<string>('AMO_CLIENT_ID')
  }

  private get clientSecret(): string {
    return this.configService.getOrThrow<string>('AMO_CLIENT_SECRET')
  }

  private get redirectUri(): string {
    return this.configService.getOrThrow<string>('AMO_REDIRECT_URI')
  }

  getAuthUrl(accountId: string): string {
    const state = accountId
    return `https://www.amocrm.ru/oauth?client_id=${this.clientId}&state=${state}&mode=post_message`
  }

  async exchangeCode(code: string, accountId: string, referer: string): Promise<void> {
    const account = await this.prisma.account.findUnique({ where: { id: accountId } })
    if (!account) throw new UnauthorizedException(`Account ${accountId} not found`)

    const baseUrl = this.buildBaseUrl(account.amoDomain, referer)

    const tokenData = await this.requestToken(baseUrl, {
      client_id: this.clientId,
      client_secret: this.clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.redirectUri,
    }, accountId)

    await this.saveTokens(accountId, tokenData, baseUrl)
  }

  async getValidTokens(accountId: string): Promise<AmoTokens> {
    const integration = await this.prisma.integration.findUnique({
      where: { accountId_provider: { accountId, provider: 'amocrm' } },
    })

    if (!integration || !integration.accessToken) {
      throw new UnauthorizedException(
        `amoCRM integration not found for account ${accountId}. Complete OAuth first.`,
      )
    }

    const baseUrl = (integration.metaJson as any)?.baseUrl as string | undefined
    if (!baseUrl) {
      throw new UnauthorizedException(`amoCRM base URL not found for account ${accountId}`)
    }

    if (integration.expiresAt && integration.expiresAt <= new Date()) {
      this.logger.log(`Token expired for account ${accountId}, refreshing...`)
      return this.refreshTokens(accountId, integration.refreshToken!, baseUrl)
    }

    return { accessToken: integration.accessToken, baseUrl }
  }

  async getIntegrationStatus(accountId: string) {
    const integration = await this.prisma.integration.findUnique({
      where: { accountId_provider: { accountId, provider: 'amocrm' } },
    })

    if (!integration) {
      return { connected: false, provider: 'amocrm' }
    }

    const expired = integration.expiresAt ? integration.expiresAt <= new Date() : true

    return {
      connected: true,
      provider: 'amocrm',
      tokenExpired: expired,
      expiresAt: integration.expiresAt,
      baseUrl: (integration.metaJson as any)?.baseUrl ?? null,
    }
  }

  private async refreshTokens(
    accountId: string,
    refreshToken: string,
    baseUrl: string,
  ): Promise<AmoTokens> {
    const tokenData = await this.requestToken(baseUrl, {
      client_id: this.clientId,
      client_secret: this.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      redirect_uri: this.redirectUri,
    }, accountId)

    await this.saveTokens(accountId, tokenData, baseUrl)

    return { accessToken: tokenData.access_token, baseUrl }
  }

  private async requestToken(
    baseUrl: string,
    body: Record<string, string>,
    accountId: string,
  ): Promise<AmoTokenResponse> {
    const url = `${baseUrl}/oauth2/access_token`

    try {
      const response = await firstValueFrom(
        this.httpService.post<AmoTokenResponse>(url, body, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000,
        }),
      )

      await this.logsService.createApiLog({
        accountId,
        provider: 'amocrm',
        action: `oauth.${body.grant_type}`,
        requestJson: { url, grant_type: body.grant_type },
        responseJson: { expires_in: response.data.expires_in },
        status: 'success',
      })

      return response.data
    } catch (error: any) {
      await this.logsService.createApiLog({
        accountId,
        provider: 'amocrm',
        action: `oauth.${body.grant_type}`,
        requestJson: { url, grant_type: body.grant_type },
        responseJson: {
          error: error?.message,
          response: error?.response?.data ?? null,
        },
        status: 'error',
      }).catch((e) => this.logger.warn('Failed to log OAuth error', e))

      throw new UnauthorizedException(
        `amoCRM OAuth failed: ${error?.response?.data?.detail ?? error?.message}`,
      )
    }
  }

  private async saveTokens(
    accountId: string,
    tokenData: AmoTokenResponse,
    baseUrl: string,
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000)

    await this.prisma.integration.upsert({
      where: { accountId_provider: { accountId, provider: 'amocrm' } },
      create: {
        accountId,
        provider: 'amocrm',
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt,
        metaJson: { baseUrl },
      },
      update: {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt,
        metaJson: { baseUrl },
      },
    })

    this.logger.log(`Saved amoCRM tokens for account ${accountId}, expires at ${expiresAt.toISOString()}`)
  }

  private buildBaseUrl(amoDomain: string | null, referer?: string): string {
    if (amoDomain) return `https://${amoDomain}.amocrm.ru`
    if (referer) {
      const match = referer.match(/https?:\/\/[\w-]+\.amocrm\.ru/)
      if (match) return match[0]
    }
    throw new UnauthorizedException('Cannot determine amoCRM domain. Set amoDomain on the account.')
  }
}
