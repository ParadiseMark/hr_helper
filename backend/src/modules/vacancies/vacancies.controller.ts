import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common'
import { VacanciesService } from './vacancies.service'
import { CreateVacancyDto } from './dto/create-vacancy.dto'
import { UpdateVacancyDto } from './dto/update-vacancy.dto'
import { UpsertHardRulesDto } from './dto/upsert-hard-rules.dto'
import { UpsertSoftRulesDto } from './dto/upsert-soft-rules.dto'
import { UpsertAutoRejectSettingsDto } from './dto/upsert-auto-reject-settings.dto'

@Controller('vacancies')
export class VacanciesController {
  constructor(private readonly vacanciesService: VacanciesService) {}

  @Post()
  create(@Body() dto: CreateVacancyDto) {
    return this.vacanciesService.create(dto)
  }

  @Get()
  findAll() {
    return this.vacanciesService.findAll()
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.vacanciesService.findOne(id)
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateVacancyDto) {
    return this.vacanciesService.update(id, dto)
  }

  // ─── Hard Rules ────────────────────────────────────────────

  @Get(':id/hard-rules')
  getHardRules(@Param('id') id: string) {
    return this.vacanciesService.getHardRules(id)
  }

  @Put(':id/hard-rules')
  upsertHardRules(@Param('id') id: string, @Body() dto: UpsertHardRulesDto) {
    return this.vacanciesService.upsertHardRules(id, dto)
  }

  // ─── Soft Rules ────────────────────────────────────────────

  @Get(':id/soft-rules')
  getSoftRules(@Param('id') id: string) {
    return this.vacanciesService.getSoftRules(id)
  }

  @Put(':id/soft-rules')
  upsertSoftRules(@Param('id') id: string, @Body() dto: UpsertSoftRulesDto) {
    return this.vacanciesService.upsertSoftRules(id, dto)
  }

  // ─── Auto Reject Settings ─────────────────────────────────

  @Get(':id/auto-reject-settings')
  getAutoRejectSettings(@Param('id') id: string) {
    return this.vacanciesService.getAutoRejectSettings(id)
  }

  @Put(':id/auto-reject-settings')
  upsertAutoRejectSettings(@Param('id') id: string, @Body() dto: UpsertAutoRejectSettingsDto) {
    return this.vacanciesService.upsertAutoRejectSettings(id, dto)
  }

  // ─── amoCRM Settings ──────────────────────────────────────

  @Put(':id/amo-settings')
  updateAmoSettings(
    @Param('id') id: string,
    @Body() body: { amoPipelineId?: string; amoStatusId?: string; amoResponsibleUserId?: string },
  ) {
    return this.vacanciesService.updateAmoSettings(id, body)
  }
}