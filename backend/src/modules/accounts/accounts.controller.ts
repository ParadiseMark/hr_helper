import { Body, Controller, Get, Param, Post, Put, Req } from '@nestjs/common'
import { AccountsService } from './accounts.service'
import { AuthService } from '../auth/auth.service'
import { Public } from '../auth/decorators/public.decorator'

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

  @Public()
  @Post()
  create(@Body('companyName') companyName: string) {
    return this.accountsService.create(companyName)
  }

  @Post(':id/rotate-api-key')
  rotateApiKey(@Param('id') id: string) {
    return this.authService.rotateApiKey(id)
  }

  @Get(':id/settings')
  getSettings(@Param('id') id: string) {
    return this.accountsService.getSettings(id)
  }

  @Put(':id/settings')
  updateSettings(@Param('id') id: string, @Body() body: { amoFieldsJson?: any }) {
    return this.accountsService.updateSettings(id, body)
  }
}