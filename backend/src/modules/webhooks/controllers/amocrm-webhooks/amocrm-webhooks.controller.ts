import { Body, Controller, Post } from '@nestjs/common'
import { AmoCrmWebhooksService } from '../../services/amocrm-webhooks/amocrm-webhooks.service'
import { AmoCrmCandidateCreatedDto } from '../../dto/amocrm-candidate-created.dto'
import { Public } from '../../../auth/decorators/public.decorator'

@Public()
@Controller('webhooks/amocrm')
export class AmoCrmWebhooksController {
  constructor(
    private readonly amoCrmWebhooksService: AmoCrmWebhooksService,
  ) {}

  @Post('candidate-created')
  async candidateCreated(@Body() dto: AmoCrmCandidateCreatedDto) {
    return this.amoCrmWebhooksService.handleCandidateCreated(dto)
  }
}