import { Module } from '@nestjs/common'
import { HttpModule } from '@nestjs/axios'
import { LogsModule } from '../logs/logs.module'
import { PrismaModule } from '../../prisma/prisma.module'
import { HhOAuthService } from './services/hh-oauth.service'
import { HhApiService } from './services/hh-api.service'
import { HhResponseProcessorService } from './services/hh-response-processor.service'
import { HhIntegrationController } from './hh-integration.controller'
import { CandidatesModule } from '../candidates/candidates.module'
import { AmoIntegrationModule } from '../amo-integration/amo-integration.module'

@Module({
  imports: [HttpModule, LogsModule, PrismaModule, CandidatesModule, AmoIntegrationModule],
  controllers: [HhIntegrationController],
  providers: [HhOAuthService, HhApiService, HhResponseProcessorService],
  exports: [HhOAuthService, HhApiService, HhResponseProcessorService],
})
export class HhIntegrationModule {}
