import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { IS_PUBLIC_KEY } from '../decorators/public.decorator'
import { AuthService } from '../auth.service'

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    if (isPublic) return true

    const request = context.switchToHttp().getRequest()
    const apiKey = this.extractApiKey(request)

    if (!apiKey) {
      throw new UnauthorizedException('Missing x-api-key header')
    }

    const account = await this.authService.validateApiKey(apiKey)

    if (!account) {
      throw new UnauthorizedException('Invalid or inactive API key')
    }

    request.account = account
    return true
  }

  private extractApiKey(request: any): string | undefined {
    return request.headers['x-api-key'] as string | undefined
  }
}
