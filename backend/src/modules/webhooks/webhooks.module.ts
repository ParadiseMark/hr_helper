import { Module } from '@nestjs/common'
import { ScoringModule } from '../scoring/scoring.module'
import { AmoIntegrationModule } from '../amo-integration/amo-integration.module'
import { AmoCrmWebhooksController } from './controllers/amocrm-webhooks/amocrm-webhooks.controller'
import { AmoCrmWebhooksService } from './services/amocrm-webhooks/amocrm-webhooks.service'

@Module({
  imports: [ScoringModule, AmoIntegrationModule],
  controllers: [AmoCrmWebhooksController],
  providers: [AmoCrmWebhooksService],
})
export class WebhooksModule {}