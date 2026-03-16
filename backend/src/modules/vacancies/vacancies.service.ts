import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { CreateVacancyDto } from './dto/create-vacancy.dto'
import { UpdateVacancyDto } from './dto/update-vacancy.dto'
import { UpsertHardRulesDto } from './dto/upsert-hard-rules.dto'
import { UpsertSoftRulesDto } from './dto/upsert-soft-rules.dto'
import { UpsertAutoRejectSettingsDto } from './dto/upsert-auto-reject-settings.dto'

@Injectable()
export class VacanciesService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateVacancyDto) {
    return this.prisma.vacancy.create({ data: dto })
  }

  findAll() {
    return this.prisma.vacancy.findMany({
      orderBy: { createdAt: 'desc' },
    })
  }

  async findOne(id: string) {
    const vacancy = await this.prisma.vacancy.findUnique({
      where: { id },
      include: {
        hardRules: true,
        softRules: true,
        autoRejectSettings: true,
      },
    })
    if (!vacancy) throw new NotFoundException(`Vacancy ${id} not found`)
    return vacancy
  }

  async update(id: string, dto: UpdateVacancyDto) {
    await this.ensureExists(id)
    return this.prisma.vacancy.update({
      where: { id },
      data: dto,
      include: {
        hardRules: true,
        softRules: true,
        autoRejectSettings: true,
      },
    })
  }

  // ─── Hard Rules ────────────────────────────────────────────

  async getHardRules(vacancyId: string) {
    await this.ensureExists(vacancyId)
    return this.prisma.vacancyHardRules.findUnique({
      where: { vacancyId },
    })
  }

  async upsertHardRules(vacancyId: string, dto: UpsertHardRulesDto) {
    await this.ensureExists(vacancyId)
    return this.prisma.vacancyHardRules.upsert({
      where: { vacancyId },
      create: { vacancyId, ...dto },
      update: dto,
    })
  }

  // ─── Soft Rules ────────────────────────────────────────────

  async getSoftRules(vacancyId: string) {
    await this.ensureExists(vacancyId)
    return this.prisma.vacancySoftRules.findUnique({
      where: { vacancyId },
    })
  }

  async upsertSoftRules(vacancyId: string, dto: UpsertSoftRulesDto) {
    await this.ensureExists(vacancyId)
    return this.prisma.vacancySoftRules.upsert({
      where: { vacancyId },
      create: { vacancyId, ...dto },
      update: dto,
    })
  }

  // ─── Auto Reject Settings ─────────────────────────────────

  async getAutoRejectSettings(vacancyId: string) {
    await this.ensureExists(vacancyId)
    return this.prisma.vacancyAutoRejectSettings.findUnique({
      where: { vacancyId },
    })
  }

  async upsertAutoRejectSettings(vacancyId: string, dto: UpsertAutoRejectSettingsDto) {
    await this.ensureExists(vacancyId)
    return this.prisma.vacancyAutoRejectSettings.upsert({
      where: { vacancyId },
      create: { vacancyId, ...dto },
      update: dto,
    })
  }

  // ─── Helpers ───────────────────────────────────────────────

  private async ensureExists(id: string) {
    const vacancy = await this.prisma.vacancy.findUnique({ where: { id } })
    if (!vacancy) throw new NotFoundException(`Vacancy ${id} not found`)
  }
}