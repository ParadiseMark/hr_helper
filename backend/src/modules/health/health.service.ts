import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class HealthService {
  constructor(private readonly configService: ConfigService) {}

  getHealth() {
    return {
      status: 'ok',
      service: 'hr-scoring-backend',
      environment: this.configService.get<string>('APP_ENV', 'development'),
      port: this.configService.get<number>('APP_PORT', 3000),
    };
  }
}