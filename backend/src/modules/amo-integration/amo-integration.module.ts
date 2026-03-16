import { Module } from '@nestjs/common'
import { HttpModule } from '@nestjs/axios'
import { LogsModule } from '../logs/logs.module'
import { AmoCrmWritebackService } from './services/amo-crm-writeback/amo-crm-writeback.service'
import { AmoCrmApiService } from './services/amo-crm-api/amo-crm-api.service'

@Module({
  imports: [HttpModule, LogsModule],
  providers: [AmoCrmWritebackService, AmoCrmApiService],
  exports: [AmoCrmWritebackService],
})
export class AmoIntegrationModule {}