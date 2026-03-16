import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './modules/health/health.module';
import { AccountsModule } from './modules/accounts/accounts.module';
import { VacanciesModule } from './modules/vacancies/vacancies.module';
import { CandidatesModule } from './modules/candidates/candidates.module';
import { ScoringModule } from './modules/scoring/scoring.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { LogsModule } from './modules/logs/logs.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module'
import { AmoIntegrationModule } from './modules/amo-integration/amo-integration.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    HealthModule,
    AccountsModule,
    VacanciesModule,
    CandidatesModule,
    ScoringModule,
    IntegrationsModule,
    LogsModule,
    WebhooksModule,
    AmoIntegrationModule,
  ],
})
export class AppModule {}