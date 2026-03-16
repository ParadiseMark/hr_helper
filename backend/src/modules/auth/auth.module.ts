import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { PrismaModule } from '../../prisma/prisma.module'
import { AuthService } from './auth.service'
import { ApiKeyGuard } from './guards/api-key.guard'

@Module({
  imports: [PrismaModule],
  providers: [
    AuthService,
    {
      provide: APP_GUARD,
      useClass: ApiKeyGuard,
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}
