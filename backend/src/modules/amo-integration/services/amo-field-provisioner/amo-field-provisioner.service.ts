import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../../../../prisma/prisma.service'
import { AmoCrmApiService } from '../amo-crm-api/amo-crm-api.service'

export interface AmoFieldsConfig {
  aiScore: number
  aiStatus: number
  hardFilterStatus: number
  lastScoredAt: number
  resumeUrl: number
  hhProfileUrl: number
}

const LEAD_FIELDS = [
  { key: 'aiScore', name: 'AI Score', field_type: 'numeric' },
  { key: 'aiStatus', name: 'AI Scoring Status', field_type: 'text' },
  { key: 'hardFilterStatus', name: 'Hard Filter Status', field_type: 'text' },
  { key: 'lastScoredAt', name: 'Last Scored At', field_type: 'date' },
  { key: 'resumeUrl', name: 'Резюме (hh.ru)', field_type: 'url' },
] as const

const CONTACT_FIELDS = [
  { key: 'hhProfileUrl', name: 'hh.ru Profile URL', field_type: 'url' },
] as const

@Injectable()
export class AmoFieldProvisionerService {
  private readonly logger = new Logger(AmoFieldProvisionerService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly amoCrmApiService: AmoCrmApiService,
  ) {}

  async provisionFields(accountId: string): Promise<AmoFieldsConfig> {
    this.logger.log(`Provisioning amoCRM fields for account ${accountId}`)

    const existingLeadFields = await this.amoCrmApiService.getLeadCustomFields(accountId)
    const existingContactFields = await this.amoCrmApiService.getContactCustomFields(accountId)

    const fieldMap: Record<string, number> = {}

    // Provision lead fields
    for (const field of LEAD_FIELDS) {
      const existing = existingLeadFields.find(
        (f: any) => f.name === field.name,
      )
      if (existing) {
        this.logger.log(`Lead field "${field.name}" already exists (id=${existing.id})`)
        fieldMap[field.key] = existing.id
      } else {
        const created = await this.amoCrmApiService.createLeadCustomField(accountId, {
          name: field.name,
          field_type: field.field_type,
          is_api_only: true,
        })
        if (created) {
          this.logger.log(`Created lead field "${field.name}" (id=${created.id})`)
          fieldMap[field.key] = created.id
        }
      }
    }

    // Provision contact fields
    for (const field of CONTACT_FIELDS) {
      const existing = existingContactFields.find(
        (f: any) => f.name === field.name,
      )
      if (existing) {
        fieldMap[field.key] = existing.id
      } else {
        const created = await this.amoCrmApiService.createContactCustomField(accountId, {
          name: field.name,
          field_type: field.field_type,
          is_api_only: true,
        })
        if (created) {
          fieldMap[field.key] = created.id
        }
      }
    }

    const amoFieldsJson = fieldMap as unknown as AmoFieldsConfig

    await this.prisma.account.update({
      where: { id: accountId },
      data: { amoFieldsJson: fieldMap },
    })

    this.logger.log(`Fields provisioned and saved for account ${accountId}`)
    return amoFieldsJson
  }

  async getFields(accountId: string): Promise<AmoFieldsConfig | null> {
    const account = await this.prisma.account.findUnique({ where: { id: accountId } })
    if (!account?.amoFieldsJson) return null
    return account.amoFieldsJson as unknown as AmoFieldsConfig
  }
}
