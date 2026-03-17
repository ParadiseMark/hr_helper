import { Module } from '@nestjs/common'
import { IntegrationsController } from './integrations.controller'
import { IntegrationsService } from './integrations.service'
import { AmoIntegrationModule } from '../amo-integration/amo-integration.module'
import { HhIntegrationModule } from '../hh-integration/hh-integration.module'

@Module({
  imports: [AmoIntegrationModule, HhIntegrationModule],
  controllers: [IntegrationsController],
  providers: [IntegrationsService],
  exports: [IntegrationsService],
})
export class IntegrationsModule {}