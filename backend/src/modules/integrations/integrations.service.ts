import { Injectable } from '@nestjs/common';

@Injectable()
export class IntegrationsService {
  getHello() {
    return 'Integrations module works';
  }
}