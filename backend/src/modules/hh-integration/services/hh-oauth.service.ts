import { Injectable, Logger, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { HttpService } from '@nestjs/axios'
import { firstValueFrom } from 'rxjs'
import { PrismaService } from '../../../prisma/prisma.service'
import { LogsService } from '../../logs/logs.service'

interface HhTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token: string
}

export interface HhTokens {
  accessToken: string
}

@Injectable()
export class HhOAuthService {
  private readonly logger = new Logger(HhOAuthService.name)
  private readonly HH_BASE_URL = 'https://hh.ru'
  private readonly HH_API_URL = 'https://api.hh.ru'

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
    private readonly logsService: LogsService,
  ) {}

  private get clientId(): string {
    return this.configService.getOrThrow<string>('HH_CLIENT_ID')
  }

  private get clientSecret(): string {
    return this.configService.getOrThrow<string>('HH_CLIENT_SECRET')
  }

  private get redirectUri(): string {
    return this.configService.get<string>('HH_REDIRECT_URI') ?? 'http://localhost:51212/'
  }

  getAuthUrl(accountId: string): string {
    const state = accountId
    return `${this.HH_BASE_URL}/oauth/authorize?response_type=code&client_id=${this.clientId}&redirect_uri=${encodeURIComponent(this.redirectUri)}&state=${state}`
  }

  async exchangeCode(code: string, accountId: string): Promise<void> {
    const tokenData = await this.requestToken({
      grant_type: 'authorization_code',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: this.redirectUri,
      code,
    }, accountId)

    await this.saveTokens(accountId, tokenData)
  }

  async getValidTokens(accountId: string): Promise<HhTokens> {
    const integration = await this.prisma.integration.findUnique({
      where: { accountId_provider: { accountId, provider: 'hh' } },
    })

    if (!integration || !integration.accessToken) {
      throw new UnauthorizedException(
        `hh.ru integration not found for account ${accountId}. Complete OAuth first.`,
      )
    }

    if (integration.expiresAt && integration.expiresAt <= new Date()) {
      if (!integration.refreshToken) {
        throw new UnauthorizedException(
          `hh.ru token expired and no refresh token for account ${accountId}`,
        )
      }
      this.logger.log(`hh.ru token expired for account ${accountId}, refreshing...`)
      return this.refreshTokens(accountId, integration.refreshToken)
    }

    return { accessToken: integration.accessToken }
  }

  async getIntegrationStatus(accountId: string) {
    const integration = await this.prisma.integration.findUnique({
      where: { accountId_provider: { accountId, provider: 'hh' } },
    })

    if (!integration) {
      return { connected: false, provider: 'hh' }
    }

    const expired = integration.expiresAt ? integration.expiresAt <= new Date() : true

    return {
      connected: true,
      provider: 'hh',
      tokenExpired: expired,
      expiresAt: integration.expiresAt,
    }
  }

  private async refreshTokens(accountId: string, refreshToken: string): Promise<HhTokens> {
    const tokenData = await this.requestToken({
      grant_type: 'refresh_token',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      refresh_token: refreshToken,
    }, accountId)

    await this.saveTokens(accountId, tokenData)
    return { accessToken: tokenData.access_token }
  }

  private async requestToken(
    body: Record<string, string>,
    accountId: string,
  ): Promise<HhTokenResponse> {
    const url = `${this.HH_BASE_URL}/oauth/token`

    try {
      const response = await firstValueFrom(
        this.httpService.post<HhTokenResponse>(url, new URLSearchParams(body).toString(), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: 10000,
        }),
      )

      await this.logsService.createApiLog({
        accountId,
        provider: 'hh',
        action: `oauth.${body.grant_type}`,
        requestJson: { url, grant_type: body.grant_type },
        responseJson: { expires_in: response.data.expires_in },
        status: 'success',
      })

      return response.data
    } catch (error: any) {
      await this.logsService.createApiLog({
        accountId,
        provider: 'hh',
        action: `oauth.${body.grant_type}`,
        requestJson: { url, grant_type: body.grant_type },
        responseJson: {
          error: error?.message,
          response: error?.response?.data ?? null,
        },
        status: 'error',
      }).catch((e) => this.logger.warn('Failed to log hh.ru OAuth error', e))

      throw new UnauthorizedException(
        `hh.ru OAuth failed: ${error?.response?.data?.error_description ?? error?.message}`,
      )
    }
  }

  private async saveTokens(accountId: string, tokenData: HhTokenResponse): Promise<void> {
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000)

    await this.prisma.integration.upsert({
      where: { accountId_provider: { accountId, provider: 'hh' } },
      create: {
        accountId,
        provider: 'hh',
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt,
        metaJson: {},
      },
      update: {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt,
        metaJson: {},
      },
    })

    this.logger.log(`Saved hh.ru tokens for account ${accountId}, expires at ${expiresAt.toISOString()}`)
  }
}
