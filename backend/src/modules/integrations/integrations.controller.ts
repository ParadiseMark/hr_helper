import { Controller, Get } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';

@Controller('integrations')
export class IntegrationsController {
  constructor(
    private readonly integrationsService: IntegrationsService,
  ) {}

  @Get()
  getHello() {
    return this.integrationsService.getHello();
  }
}