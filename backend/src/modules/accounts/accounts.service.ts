import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { randomBytes } from 'crypto';

@Injectable()
export class AccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  async findAll() {
    return this.prisma.account.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async create(companyName: string) {
    const id = randomBytes(8).toString('hex');
    const apiKey = this.authService.generateApiKey();
    const account = await this.prisma.account.create({
      data: { id, companyName, apiKey },
    });
    return { accountId: account.id, companyName: account.companyName, apiKey };
  }

  async getSettings(id: string) {
    const account = await this.prisma.account.findUnique({ where: { id } });
    if (!account) return null;
    return { amoFieldsJson: account.amoFieldsJson };
  }

  async updateSettings(id: string, data: { amoFieldsJson?: any }) {
    return this.prisma.account.update({ where: { id }, data });
  }
}