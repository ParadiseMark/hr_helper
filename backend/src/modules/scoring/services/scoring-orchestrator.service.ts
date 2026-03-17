import { Injectable, Logger, NotFoundException, Optional, Inject } from '@nestjs/common'
import { PrismaService } from '../../../prisma/prisma.service'
import { LogsService } from '../../logs/logs.service'
import { HardFilterService } from './hard-filter.service'
import { AiScoringService } from './ai-scoring.service'
import type { HardFilterRules } from '../types/hard-filter.types'
import type { AiScoringSoftRulesInput } from '../types/ai-scoring.types'

@Injectable()
export class ScoringOrchestratorService {
  private readonly logger = new Logger(ScoringOrchestratorService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly hardFilterService: HardFilterService,
    private readonly aiScoringService: AiScoringService,
    private readonly logsService: LogsService,
  ) {}

  async run(candidateId: string, vacancyId: string) {
    const candidate = await this.prisma.candidate.findUnique({
      where: { id: candidateId },
    })
    if (!candidate) {
      throw new NotFoundException(`Candidate with id "${candidateId}" not found`)
    }

    const vacancy = await this.prisma.vacancy.findUnique({
      where: { id: vacancyId },
      include: {
        hardRules: true,
        softRules: true,
        autoRejectSettings: true,
      },
    })
    if (!vacancy) {
      throw new NotFoundException(`Vacancy with id "${vacancyId}" not found`)
    }

    const requestPayload = { candidateId, vacancyId }

    try {
      // --- Hard Filter (rules from DB) ---
      const hardRules = this.mapHardRules(vacancy.hardRules)

      const hardFilterResult = this.hardFilterService.evaluate(
        {
          age: candidate.age,
          gender: candidate.gender,
          city: candidate.city,
          salaryExpectation: candidate.salaryExpectation,
        },
        hardRules,
      )

      const autoRejectSettings = vacancy.autoRejectSettings

      if (!hardFilterResult.passed) {
        const shouldAutoReject = autoRejectSettings?.rejectOnHardFail === true && !!candidate.hhResponseId
        const autoRejectType = shouldAutoReject ? 'hard' : null
        const autoRejectStatus = shouldAutoReject ? 'pending' : candidate.hhResponseId ? 'not_needed' : null

        const scoringRun = await this.prisma.scoringRun.create({
          data: {
            candidateId: candidate.id,
            vacancyId: vacancy.id,
            hardFilterPassed: false,
            hardRejectReason: hardFilterResult.reason ?? 'Hard filter failed',
            score: 0,
            summary: 'Кандидат отклонён по жёстким фильтрам',
            reasonsJson: [],
            strengthsJson: [],
            weaknessesJson: [],
            status: 'rejected',
            autoRejectTriggered: shouldAutoReject,
            autoRejectType,
            autoRejectStatus,
          },
        })

        await this.logsService.createApiLog({
          accountId: candidate.accountId,
          provider: 'internal',
          action: 'scoring.run',
          requestJson: requestPayload,
          responseJson: { hardFilterResult, scoringRunId: scoringRun.id, autoRejectTriggered: shouldAutoReject },
          status: 'rejected',
        })

        return {
          message: 'Candidate rejected by hard filters',
          candidate,
          vacancy,
          hardFilterResult,
          aiScoringResult: null,
          scoringRun,
        }
      }

      // --- AI Soft Scoring (with soft rules from DB) ---
      const softRules = this.mapSoftRules(vacancy.softRules)

      const aiScoringResult = await this.aiScoringService.evaluate(
        {
          fullName: candidate.fullName,
          age: candidate.age,
          city: candidate.city,
          resumeText: candidate.resumeText,
        },
        {
          name: vacancy.name,
          jobDescription: vacancy.jobDescription,
          companyDescription: vacancy.companyDescription,
        },
        softRules,
        candidate.accountId,
      )

      const shouldSoftReject =
        autoRejectSettings?.rejectOnSoftFail === true &&
        autoRejectSettings?.softRejectThreshold != null &&
        aiScoringResult.score < autoRejectSettings.softRejectThreshold &&
        !!candidate.hhResponseId

      const scoringRun = await this.prisma.scoringRun.create({
        data: {
          candidateId: candidate.id,
          vacancyId: vacancy.id,
          hardFilterPassed: true,
          score: aiScoringResult.score,
          summary: aiScoringResult.summary,
          reasonsJson: aiScoringResult.reasons,
          strengthsJson: aiScoringResult.strengths,
          weaknessesJson: aiScoringResult.weaknesses,
          status: 'scored',
          autoRejectTriggered: shouldSoftReject,
          autoRejectType: shouldSoftReject ? 'soft' : null,
          autoRejectStatus: shouldSoftReject ? 'pending' : candidate.hhResponseId ? 'not_needed' : null,
        },
      })

      await this.logsService.createApiLog({
        accountId: candidate.accountId,
        provider: 'internal',
        action: 'scoring.run',
        requestJson: requestPayload,
        responseJson: { hardFilterResult, aiScoringResult, scoringRunId: scoringRun.id, autoRejectTriggered: shouldSoftReject },
        status: 'success',
      })

      return {
        message: 'Scoring completed successfully',
        candidate,
        vacancy,
        hardFilterResult,
        aiScoringResult,
        scoringRun,
      }
    } catch (error: any) {
      this.logger.error(`Scoring failed for candidate ${candidateId}`, error?.stack)

      const scoringRun = await this.prisma.scoringRun.create({
        data: {
          candidateId: candidate.id,
          vacancyId: vacancy.id,
          hardFilterPassed: null,
          score: null,
          summary: 'Scoring failed due to internal error',
          status: 'error',
          errorMessage: error?.message ?? 'Unknown error',
        },
      })

      await this.logsService.createApiLog({
        accountId: candidate.accountId,
        provider: 'internal',
        action: 'scoring.run',
        requestJson: requestPayload,
        responseJson: { error: error?.message, scoringRunId: scoringRun.id },
        status: 'error',
      }).catch((logErr) => this.logger.warn('Failed to write error log', logErr))

      throw error
    }
  }

  private mapHardRules(dbRules: any | null): HardFilterRules {
    if (!dbRules) return {}
    return {
      ageFrom: dbRules.ageFrom,
      ageTo: dbRules.ageTo,
      gender: dbRules.gender,
      allowedCities: dbRules.allowedCitiesJson as string[] | null,
      relocationRequired: dbRules.relocationRequired,
      minExperienceYears: dbRules.minExperienceYears,
      salaryMax: dbRules.salaryMax,
      languageRequirements: dbRules.languageRequirementsJson as string[] | null,
      citizenshipRequirements: dbRules.citizenshipRequirementsJson as string[] | null,
      employmentType: dbRules.employmentType,
      workSchedule: dbRules.workSchedule,
      requiredSkills: dbRules.requiredSkillsJson as string[] | null,
      stopFactors: dbRules.stopFactorsJson as string[] | null,
    }
  }

  private mapSoftRules(dbRules: any | null): AiScoringSoftRulesInput | null {
    if (!dbRules) return null
    return {
      mustHave: dbRules.mustHaveJson as string[] | null,
      niceToHave: dbRules.niceToHaveJson as string[] | null,
      advantages: dbRules.advantagesJson as string[] | null,
      risks: dbRules.risksJson as string[] | null,
      hrComments: dbRules.hrComments,
    }
  }
}