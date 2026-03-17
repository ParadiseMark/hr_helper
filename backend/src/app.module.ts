import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ServeStaticModule } from '@nestjs/serve-static'
import { join } from 'path'
import { PrismaModule } from './prisma/prisma.module'
import { AuthModule } from './modules/auth/auth.module'
import { HealthModule } from './modules/health/health.module'
import { AccountsModule } from './modules/accounts/accounts.module'
import { VacanciesModule } from './modules/vacancies/vacancies.module'
import { CandidatesModule } from './modules/candidates/candidates.module'
import { ScoringModule } from './modules/scoring/scoring.module'
import { IntegrationsModule } from './modules/integrations/integrations.module'
import { LogsModule } from './modules/logs/logs.module'
import { WebhooksModule } from './modules/webhooks/webhooks.module'
import { AmoIntegrationModule } from './modules/amo-integration/amo-integration.module'
import { HhIntegrationModule } from './modules/hh-integration/hh-integration.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'public'),
      serveRoot: '/widget',
    }),
    PrismaModule,
    AuthModule,
    HealthModule,
    AccountsModule,
    VacanciesModule,
    CandidatesModule,
    ScoringModule,
    IntegrationsModule,
    LogsModule,
    WebhooksModule,
    AmoIntegrationModule,
    HhIntegrationModule,
  ],
})
export class AppModule {}