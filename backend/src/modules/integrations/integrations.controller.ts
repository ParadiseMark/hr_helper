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
}