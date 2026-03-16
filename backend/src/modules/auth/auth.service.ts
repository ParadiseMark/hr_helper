import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { randomBytes } from 'crypto'

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async validateApiKey(apiKey: string) {
    if (!apiKey) return null

    const account = await this.prisma.account.findUnique({
      where: { apiKey },
    })

    if (!account || account.status !== 'active') return null
    return account
  }

  generateApiKey(): string {
    return `hrsw_${randomBytes(32).toString('hex')}`
  }

  async rotateApiKey(accountId: string) {
    const newKey = this.generateApiKey()
    const account = await this.prisma.account.update({
      where: { id: accountId },
      data: { apiKey: newKey },
    })
    return { accountId: account.id, apiKey: newKey }
  }
}
