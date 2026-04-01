import { Module } from '@nestjs/common'
import { HttpModule } from '@nestjs/axios'
import { LogsModule } from '../logs/logs.module'
import { PrismaModule } from '../../prisma/prisma.module'
import { AmoCrmWritebackService } from './services/amo-crm-writeback/amo-crm-writeback.service'
import { AmoCrmApiService } from './services/amo-crm-api/amo-crm-api.service'
import { AmoOAuthService } from './services/amo-oauth/amo-oauth.service'
import { AmoFieldProvisionerService } from './services/amo-field-provisioner/amo-field-provisioner.service'

@Module({
  imports: [HttpModule, LogsModule, PrismaModule],
  providers: [AmoOAuthService, AmoCrmApiService, AmoCrmWritebackService, AmoFieldProvisionerService],
  exports: [AmoCrmWritebackService, AmoOAuthService, AmoCrmApiService, AmoFieldProvisionerService],
})
export class AmoIntegrationModule {}