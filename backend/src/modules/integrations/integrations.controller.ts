import { Controller, Get, Post, Query, Body, Req } from '@nestjs/common'
import { IntegrationsService } from './integrations.service'
import { Public } from '../auth/decorators/public.decorator'

@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Get('amocrm/auth-url')
  getAmoCrmAuthUrl(@Req() req: any) {
    return this.integrationsService.getAmoCrmAuthUrl(req.account.id)
  }

  @Public()
  @Post('amocrm/callback')
  handleAmoCrmCallback(
    @Body() body: { code: string; accountId: string; referer?: string },
  ) {
    return this.integrationsService.handleAmoCrmCallback(
      body.code,
      body.accountId,
      body.referer,
    )
  }

  @Get('status')
  getStatus(@Req() req: any) {
    return this.integrationsService.getStatus(req.account.id)
  }

  @Post('amocrm/provision-fields')
  provisionFields(@Req() req: any) {
    return this.integrationsService.provisionFields(req.account.id)
  }

  @Get('amocrm/pipelines')
  getPipelines(@Req() req: any) {
    return this.integrationsService.getPipelines(req.account.id)
  }

  @Get('amocrm/users')
  getUsers(@Req() req: any) {
    return this.integrationsService.getUsers(req.account.id)
  }

  @Post('amocrm/test-lead')
  createTestLead(
    @Req() req: any,
    @Body() body: { name?: string },
  ) {
    return this.integrationsService.createTestLead(
      req.account.id,
      body.name ?? 'TEST - HR Scoring Widget',
    )
  }
}