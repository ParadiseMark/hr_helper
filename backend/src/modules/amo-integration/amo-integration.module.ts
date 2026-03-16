import { Module } from '@nestjs/common'
import { HttpModule } from '@nestjs/axios'
import { LogsModule } from '../logs/logs.module'
import { PrismaModule } from '../../prisma/prisma.module'
import { AmoCrmWritebackService } from './services/amo-crm-writeback/amo-crm-writeback.service'
import { AmoCrmApiService } from './services/amo-crm-api/amo-crm-api.service'
import { AmoOAuthService } from './services/amo-oauth/amo-oauth.service'

@Module({
  imports: [HttpModule, LogsModule, PrismaModule],
  providers: [AmoOAuthService, AmoCrmApiService, AmoCrmWritebackService],
  exports: [AmoCrmWritebackService, AmoOAuthService, AmoCrmApiService],
})
export class AmoIntegrationModule {}