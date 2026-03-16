import { Controller, Get, Param, Post } from '@nestjs/common'
import { AccountsService } from './accounts.service'
import { AuthService } from '../auth/auth.service'

@Controller('accounts')
export class AccountsController {
  constructor(
    private readonly accountsService: AccountsService,
    private readonly authService: AuthService,
  ) {}

  @Get()
  findAll() {
    return this.accountsService.findAll()
  }

  @Post(':id/rotate-api-key')
  rotateApiKey(@Param('id') id: string) {
    return this.authService.rotateApiKey(id)
  }
}