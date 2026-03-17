import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../../prisma/prisma.service'
import { HhApiService, HhResume } from './hh-api.service'
import { AmoCrmApiService } from '../../amo-integration/services/amo-crm-api/amo-crm-api.service'

export interface ProcessedCandidate {
  candidateId: string
  amoLeadId: string | null
  fullName: string
  isNew: boolean
}

@Injectable()
export class HhResponseProcessorService {
  private readonly logger = new Logger(HhResponseProcessorService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly hhApiService: HhApiService,
    private readonly amoCrmApiService: AmoCrmApiService,
  ) {}

  async processResponse(
    accountId: string,
    vacancyId: string,
    negotiationId: string,
    resumeId: string,
    resumeSnapshotFromNegotiation?: any,
  ): Promise<ProcessedCandidate> {
    const vacancy = await this.prisma.vacancy.findUnique({ where: { id: vacancyId } })
    if (!vacancy) throw new NotFoundException(`Vacancy ${vacancyId} not found`)

    let resume: HhResume | null = null
    try {
      resume = await this.hhApiService.getResume(accountId, resumeId)
    } catch (err: any) {
      this.logger.warn(`Could not fetch full resume ${resumeId}, using snapshot: ${err?.message}`)
    }

    const source = resume ?? resumeSnapshotFromNegotiation
    if (!source) throw new NotFoundException(`No resume data for ${resumeId}`)

    const fullName = this.buildFullName(source)
    const resumeText = this.buildResumeText(source)

    const existing = await this.prisma.candidate.findFirst({
      where: { accountId, vacancyId, hhCandidateId: resumeId },
    })

    if (existing) {
      await this.prisma.candidate.update({
        where: { id: existing.id },
        data: {
          hhResponseId: negotiationId,
          rawResumeJson: resume ?? resumeSnapshotFromNegotiation ?? undefined,
          resumeText,
          fullName,
          age: source.age ?? existing.age,
          gender: source.gender?.id ?? existing.gender,
          city: source.area?.name ?? existing.city,
          salaryExpectation: source.salary?.amount ?? existing.salaryExpectation,
        },
      })

      return {
        candidateId: existing.id,
        amoLeadId: existing.amoLeadId,
        fullName,
        isNew: false,
      }
    }

    const candidate = await this.prisma.candidate.create({
      data: {
        accountId,
        vacancyId,
        hhCandidateId: resumeId,
        hhResponseId: negotiationId,
        fullName,
        age: source.age ?? null,
        gender: source.gender?.id ?? null,
        city: source.area?.name ?? null,
        salaryExpectation: source.salary?.amount ?? null,
        resumeText,
        rawResumeJson: resume ?? resumeSnapshotFromNegotiation ?? undefined,
      },
    })

    let amoLeadId: string | null = null
    try {
      const leadResult = await this.amoCrmApiService.createOrUpdateLead(accountId, {
        name: `${fullName} — ${vacancy.name}`,
      })
      amoLeadId = String(leadResult._embedded?.leads?.[0]?.id ?? null)

      if (amoLeadId) {
        await this.prisma.candidate.update({
          where: { id: candidate.id },
          data: { amoLeadId },
        })
      }
    } catch (err: any) {
      this.logger.warn(`Failed to create amoCRM lead for candidate ${candidate.id}: ${err?.message}`)
    }

    return {
      candidateId: candidate.id,
      amoLeadId,
      fullName,
      isNew: true,
    }
  }

  private buildFullName(resume: any): string {
    const parts = [resume.last_name, resume.first_name, resume.middle_name].filter(Boolean)
    return parts.join(' ') || 'Unknown'
  }

  private buildResumeText(resume: any): string {
    const sections: string[] = []

    if (resume.title) sections.push(`Должность: ${resume.title}`)
    if (resume.area?.name) sections.push(`Город: ${resume.area.name}`)
    if (resume.age) sections.push(`Возраст: ${resume.age}`)
    if (resume.salary) sections.push(`Зарплата: ${resume.salary.amount} ${resume.salary.currency}`)

    if (resume.skill_set?.length) {
      sections.push(`Навыки: ${resume.skill_set.join(', ')}`)
    }

    if (resume.experience?.length) {
      sections.push('\nОпыт работы:')
      for (const exp of resume.experience) {
        const period = `${exp.start ?? ''}–${exp.end ?? 'по настоящее время'}`
        sections.push(`  ${exp.position}${exp.company ? ` в ${exp.company}` : ''} (${period})`)
        if (exp.description) sections.push(`    ${exp.description.substring(0, 500)}`)
      }
    }

    if (resume.language?.length) {
      const langs = resume.language.map((l: any) => `${l.name} (${l.level?.name ?? ''})`).join(', ')
      sections.push(`Языки: ${langs}`)
    }

    if (resume.citizenship?.length) {
      sections.push(`Гражданство: ${resume.citizenship.map((c: any) => c.name).join(', ')}`)
    }

    return sections.join('\n')
  }
}
