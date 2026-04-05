import { Controller, Get, Post, Body, Req, Query, Param, Res } from '@nestjs/common'
import type { Response } from 'express'
import { HhOAuthService } from './services/hh-oauth.service'
import { HhApiService } from './services/hh-api.service'
import { HhResponseProcessorService } from './services/hh-response-processor.service'
import { PrismaService } from '../../prisma/prisma.service'
import { Public } from '../auth/decorators/public.decorator'

@Controller('hh')
export class HhIntegrationController {
  constructor(
    private readonly hhOAuthService: HhOAuthService,
    private readonly hhApiService: HhApiService,
    private readonly hhResponseProcessor: HhResponseProcessorService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('auth-url')
  getAuthUrl(@Req() req: any) {
    const url = this.hhOAuthService.getAuthUrl(req.account.id)
    return { authUrl: url }
  }

  @Public()
  @Get('callback')
  async hhCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    if (!code || !state) return res.status(200).send('OK')
    await this.hhOAuthService.exchangeCode(code, state)
    return res.send('<html><body><h2>hh.ru успешно подключён.</h2><script>window.close()</script></body></html>')
  }

  @Post('exchange-code')
  async exchangeCode(@Req() req: any, @Body() body: { code: string }) {
    await this.hhOAuthService.exchangeCode(body.code, req.account.id)
    return { message: 'hh.ru integration connected successfully' }
  }

  @Get('status')
  getStatus(@Req() req: any) {
    return this.hhOAuthService.getIntegrationStatus(req.account.id)
  }

  @Get('responses/:vacancyId')
  async getResponses(
    @Req() req: any,
    @Param('vacancyId') vacancyId: string,
    @Query('page') page?: string,
  ) {
    const vacancy = await this.prisma.vacancy.findUnique({ where: { id: vacancyId } })
    if (!vacancy?.hhVacancyId) {
      return { error: 'Vacancy not found or has no hh_vacancy_id' }
    }

    return this.hhApiService.getNegotiations(
      req.account.id,
      vacancy.hhVacancyId,
      page ? Number(page) : 0,
    )
  }

  @Post('process-responses/:vacancyId')
  async processResponses(
    @Req() req: any,
    @Param('vacancyId') vacancyId: string,
  ) {
    const vacancy = await this.prisma.vacancy.findUnique({ where: { id: vacancyId } })
    if (!vacancy?.hhVacancyId) {
      return { error: 'Vacancy not found or has no hh_vacancy_id' }
    }

    const accountId = req.account.id
    const negotiations = await this.hhApiService.getNegotiations(accountId, vacancy.hhVacancyId, 0, 50)
    const results: any[] = []

    for (const neg of negotiations.items ?? []) {
      try {
        const result = await this.hhResponseProcessor.processResponse(
          accountId,
          vacancyId,
          String(neg.id),
          neg.resume?.id,
          neg.resume,
        )
        results.push({ negotiationId: neg.id, ...result })
      } catch (err: any) {
        results.push({ negotiationId: neg.id, error: err?.message })
      }
    }

    return {
      message: `Processed ${results.length} responses`,
      vacancyId,
      hhVacancyId: vacancy.hhVacancyId,
      results,
    }
  }

  @Post('reject/:negotiationId')
  async rejectNegotiation(
    @Req() req: any,
    @Param('negotiationId') negotiationId: string,
    @Body() body: { message?: string },
  ) {
    return this.hhApiService.rejectNegotiation(req.account.id, negotiationId, body.message)
  }
}
