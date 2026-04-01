import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { firstValueFrom } from 'rxjs'
import { PrismaService } from '../../../prisma/prisma.service'
import { HhApiService, HhResume } from './hh-api.service'
import { HhOAuthService } from './hh-oauth.service'
import { AmoCrmApiService } from '../../amo-integration/services/amo-crm-api/amo-crm-api.service'
import { AmoFieldProvisionerService } from '../../amo-integration/services/amo-field-provisioner/amo-field-provisioner.service'

export interface ProcessedCandidate {
  candidateId: string
  amoLeadId: string | null
  fullName: string
  isNew: boolean
}

@Injectable()
export class HhResponseProcessorService {
  private readonly logger = new Logger(HhResponseProcessorService.name)
  private readonly HH_API_BASE = 'https://api.hh.ru'

  constructor(
    private readonly prisma: PrismaService,
    private readonly hhApiService: HhApiService,
    private readonly hhOAuthService: HhOAuthService,
    private readonly httpService: HttpService,
    private readonly amoCrmApiService: AmoCrmApiService,
    private readonly amoFieldProvisioner: AmoFieldProvisionerService,
  ) {}

  async processResponse(
    accountId: string,
    vacancyId: string,
    negotiationId: string,
    resumeId: string,
    resumeSnapshotFromNegotiation?: any,
    coverLetter?: string,
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
    const enrichedData = this.extractEnrichedData(source, resumeId)

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
          coverLetter: coverLetter ?? existing.coverLetter,
          ...enrichedData,
        },
      })

      return { candidateId: existing.id, amoLeadId: existing.amoLeadId, fullName, isNew: false }
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
        coverLetter: coverLetter ?? null,
        ...enrichedData,
      },
    })

    let amoLeadId: string | null = null
    let amoContactId: string | null = null

    try {
      const amoFields = await this.amoFieldProvisioner.getFields(accountId)

      // 1. Create contact
      const contactCustomFields: { field_id: number; values: { value: any }[] }[] = []
      if (amoFields?.hhProfileUrl && enrichedData.hhProfileUrl) {
        contactCustomFields.push({
          field_id: amoFields.hhProfileUrl,
          values: [{ value: enrichedData.hhProfileUrl }],
        })
      }

      const contact = await this.amoCrmApiService.createContact(accountId, {
        name: fullName,
        phone: enrichedData.phone ?? null,
        email: enrichedData.email ?? null,
        customFieldsValues: contactCustomFields.length ? contactCustomFields : undefined,
      })
      amoContactId = contact ? String(contact.id) : null

      // 2. Create lead with pipeline/stage/manager and contact
      const leadCustomFields: { field_id: number; values: { value: any }[] }[] = []
      if (amoFields?.resumeUrl && enrichedData.hhResumeUrl) {
        leadCustomFields.push({
          field_id: amoFields.resumeUrl,
          values: [{ value: enrichedData.hhResumeUrl }],
        })
      }

      const leadResult = await this.amoCrmApiService.createOrUpdateLead(accountId, {
        name: `${fullName} — ${vacancy.name}`,
        pipelineId: vacancy.amoPipelineId,
        statusId: vacancy.amoStatusId,
        responsibleUserId: vacancy.amoResponsibleUserId,
        customFieldsValues: leadCustomFields.length ? leadCustomFields : undefined,
        contactIds: amoContactId ? [Number(amoContactId)] : undefined,
      })
      amoLeadId = String(leadResult._embedded?.leads?.[0]?.id ?? null)

      if (amoLeadId) {
        await this.prisma.candidate.update({
          where: { id: candidate.id },
          data: { amoLeadId, amoContactId },
        })

        // 3. Attach PDF resume
        await this.attachResumePdf(accountId, amoLeadId, resumeId, fullName)

        // 4. Add cover letter note
        if (coverLetter?.trim()) {
          await this.amoCrmApiService.createLeadNote(
            accountId,
            amoLeadId,
            `Сопроводительное письмо:\n\n${coverLetter}`,
          )
        }
      }
    } catch (err: any) {
      this.logger.warn(`Failed to create amoCRM lead/contact for candidate ${candidate.id}: ${err?.message}`)
    }

    return { candidateId: candidate.id, amoLeadId, fullName, isNew: true }
  }

  private extractEnrichedData(source: any, resumeId: string) {
    const phone = this.extractContact(source.contact, 'cell') ??
      this.extractContact(source.contact, 'home') ??
      null
    const email = this.extractContact(source.contact, 'email') ?? null

    return {
      hhResumeUrl: `https://hh.ru/resume/${resumeId}`,
      hhProfileUrl: source.alternate_url ?? null,
      phone,
      email,
      experienceMonths: source.total_experience?.months ?? null,
      employmentType: source.employment?.id ?? null,
      workSchedule: source.schedule?.id ?? null,
      skillsJson: source.skill_set?.length ? source.skill_set : undefined,
      languagesJson: source.language?.length ? source.language : undefined,
      citizenshipJson: source.citizenship?.length ? source.citizenship : undefined,
    }
  }

  private extractContact(contacts: any[], type: string): string | null {
    if (!Array.isArray(contacts)) return null
    const found = contacts.find((c: any) => c.type?.id === type || c.preferred === true && type === 'cell')
    return found?.value?.formatted ?? found?.value ?? null
  }

  private async attachResumePdf(
    accountId: string,
    amoLeadId: string,
    resumeId: string,
    fullName: string,
  ) {
    try {
      const tokens = await this.hhOAuthService.getValidTokens(accountId)
      const pdfUrl = `${this.HH_API_BASE}/resumes/${resumeId}/download?format=pdf`

      const response = await firstValueFrom(
        this.httpService.get(pdfUrl, {
          headers: {
            Authorization: `Bearer ${tokens.accessToken}`,
            'User-Agent': 'HR-Scoring-Widget/1.0 (hr-scoring@example.com)',
          },
          responseType: 'arraybuffer',
          timeout: 30000,
        }),
      )

      const fileBuffer = Buffer.from(response.data)
      const filename = `resume_${fullName.replace(/\s+/g, '_')}.pdf`

      await this.amoCrmApiService.attachFileToLeadNote(
        accountId,
        amoLeadId,
        fileBuffer,
        filename,
        'application/pdf',
      )
    } catch (err: any) {
      this.logger.warn(`Could not attach PDF resume to lead ${amoLeadId}: ${err?.message}`)
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
