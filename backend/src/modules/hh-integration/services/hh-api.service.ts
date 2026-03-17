import { Injectable, Logger } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { firstValueFrom } from 'rxjs'
import { LogsService } from '../../logs/logs.service'
import { HhOAuthService } from './hh-oauth.service'

export interface HhNegotiation {
  id: string
  state: { id: string; name: string }
  resume: {
    id: string
    title: string
    url: string
    first_name: string
    last_name: string
    middle_name: string | null
    age: number | null
    gender: { id: string; name: string } | null
    area: { id: string; name: string } | null
    salary: { amount: number; currency: string } | null
    total_experience: { months: number } | null
    experience: Array<{
      position: string
      company: string | null
      start: string
      end: string | null
      description: string | null
    }>
    skill_set: string[]
    certificate: Array<{ title: string }>
    language: Array<{ id: string; name: string; level: { id: string; name: string } }>
    citizenship: Array<{ id: string; name: string }>
  }
  created_at: string
  vacancy: { id: string; name: string }
}

export interface HhResume {
  id: string
  title: string
  first_name: string
  last_name: string
  middle_name: string | null
  age: number | null
  gender: { id: string; name: string } | null
  area: { id: string; name: string } | null
  salary: { amount: number; currency: string } | null
  total_experience: { months: number } | null
  experience: Array<{
    position: string
    company: string | null
    start: string
    end: string | null
    description: string | null
  }>
  skill_set: string[]
  language: Array<{ id: string; name: string; level: { id: string; name: string } }>
  citizenship: Array<{ id: string; name: string }>
  photo: { small: string } | null
  [key: string]: any
}

@Injectable()
export class HhApiService {
  private readonly logger = new Logger(HhApiService.name)
  private readonly API_BASE = 'https://api.hh.ru'

  constructor(
    private readonly httpService: HttpService,
    private readonly logsService: LogsService,
    private readonly hhOAuthService: HhOAuthService,
  ) {}

  private async getHeaders(accountId: string) {
    const tokens = await this.hhOAuthService.getValidTokens(accountId)
    return {
      Authorization: `Bearer ${tokens.accessToken}`,
      'User-Agent': 'HR-Scoring-Widget/1.0 (hr-scoring@example.com)',
      'Content-Type': 'application/json',
    }
  }

  async getNegotiations(accountId: string, vacancyHhId: string, page = 0, perPage = 20) {
    const headers = await this.getHeaders(accountId)
    const url = `${this.API_BASE}/negotiations?vacancy_id=${vacancyHhId}&page=${page}&per_page=${perPage}`

    try {
      const response = await firstValueFrom(
        this.httpService.get(url, { headers, timeout: 15000 }),
      )

      await this.logsService.createApiLog({
        accountId,
        provider: 'hh',
        action: 'negotiations.list',
        requestJson: { vacancyHhId, page, perPage },
        responseJson: { found: response.data.found, page: response.data.page, items: response.data.items?.length },
        status: 'success',
      })

      return response.data
    } catch (error: any) {
      await this.logError(accountId, 'negotiations.list', { vacancyHhId, page }, error)
      throw error
    }
  }

  async getResume(accountId: string, resumeId: string): Promise<HhResume> {
    const headers = await this.getHeaders(accountId)
    const url = `${this.API_BASE}/resumes/${resumeId}`

    try {
      const response = await firstValueFrom(
        this.httpService.get<HhResume>(url, { headers, timeout: 15000 }),
      )

      await this.logsService.createApiLog({
        accountId,
        provider: 'hh',
        action: 'resume.get',
        requestJson: { resumeId },
        responseJson: { id: response.data.id, title: response.data.title },
        status: 'success',
      })

      return response.data
    } catch (error: any) {
      await this.logError(accountId, 'resume.get', { resumeId }, error)
      throw error
    }
  }

  async rejectNegotiation(accountId: string, negotiationId: string, message?: string) {
    const headers = await this.getHeaders(accountId)
    const url = `${this.API_BASE}/negotiations/discard`

    const body: Record<string, string> = { id: negotiationId }
    if (message) body.message = message

    try {
      const response = await firstValueFrom(
        this.httpService.put(url, new URLSearchParams(body).toString(), {
          headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: 15000,
        }),
      )

      await this.logsService.createApiLog({
        accountId,
        provider: 'hh',
        action: 'negotiation.reject',
        requestJson: { negotiationId, message },
        responseJson: { status: response.status },
        status: 'success',
      })

      return { rejected: true, negotiationId }
    } catch (error: any) {
      await this.logError(accountId, 'negotiation.reject', { negotiationId }, error)
      throw error
    }
  }

  async getVacancy(accountId: string, vacancyId: string) {
    const headers = await this.getHeaders(accountId)
    const url = `${this.API_BASE}/vacancies/${vacancyId}`

    try {
      const response = await firstValueFrom(
        this.httpService.get(url, { headers, timeout: 15000 }),
      )

      return response.data
    } catch (error: any) {
      await this.logError(accountId, 'vacancy.get', { vacancyId }, error)
      throw error
    }
  }

  private async logError(accountId: string, action: string, request: any, error: any) {
    await this.logsService.createApiLog({
      accountId,
      provider: 'hh',
      action,
      requestJson: request,
      responseJson: {
        message: error?.message ?? 'Unknown hh.ru error',
        response: error?.response?.data ?? null,
        status: error?.response?.status ?? null,
      },
      status: 'error',
    }).catch((e) => this.logger.warn('Failed to log hh.ru error', e))
  }
}
