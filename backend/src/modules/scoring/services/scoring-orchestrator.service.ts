import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../../prisma/prisma.service'
import { LogsService } from '../../logs/logs.service'
import { HardFilterService } from './hard-filter.service'
import { AiScoringService } from './ai-scoring.service'

@Injectable()
export class ScoringOrchestratorService {
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
      throw new NotFoundException(
        `Candidate with id "${candidateId}" not found`,
      )
    }

    const vacancy = await this.prisma.vacancy.findUnique({
      where: { id: vacancyId },
    })

    if (!vacancy) {
      throw new NotFoundException(
        `Vacancy with id "${vacancyId}" not found`,
      )
    }

    const requestPayload = {
      candidateId,
      vacancyId,
    }

    try {
      const hardFilterResult = this.hardFilterService.evaluate(
        {
          age: candidate.age,
          city: candidate.city,
        },
        {
          ageFrom: 18,
          ageTo: 40,
          allowedCities: ['Moscow', 'Dubai'],
        },
      )

      if (!hardFilterResult.passed) {
        const scoringRun = await this.prisma.scoringRun.create({
          data: {
            candidateId: candidate.id,
            vacancyId: vacancy.id,
            hardFilterPassed: false,
            hardRejectReason: hardFilterResult.reason ?? 'Hard filter failed',
            score: 0,
            summary: 'Candidate was rejected by hard filters',
            reasonsJson: [],
            strengthsJson: [],
            weaknessesJson: [],
            status: 'rejected',
            errorMessage: null,
          },
        })

        const responsePayload = {
          message: 'Candidate rejected by hard filters',
          hardFilterResult,
          aiScoringResult: null,
          scoringRunId: scoringRun.id,
        }

        await this.logsService.createApiLog({
          accountId: candidate.accountId,
          provider: 'internal',
          action: 'scoring.run',
          requestJson: requestPayload,
          responseJson: responsePayload,
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
      )

      const scoringRun = await this.prisma.scoringRun.create({
        data: {
          candidateId: candidate.id,
          vacancyId: vacancy.id,
          hardFilterPassed: true,
          hardRejectReason: null,
          score: aiScoringResult.score,
          summary: aiScoringResult.summary,
          reasonsJson: aiScoringResult.reasons,
          strengthsJson: aiScoringResult.strengths,
          weaknessesJson: aiScoringResult.weaknesses,
          status: 'scored',
          errorMessage: null,
        },
      })

      const responsePayload = {
        message: 'Scoring completed successfully',
        hardFilterResult,
        aiScoringResult,
        scoringRunId: scoringRun.id,
      }

      await this.logsService.createApiLog({
        accountId: candidate.accountId,
        provider: 'internal',
        action: 'scoring.run',
        requestJson: requestPayload,
        responseJson: responsePayload,
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
      const scoringRun = await this.prisma.scoringRun.create({
        data: {
          candidateId: candidate.id,
          vacancyId: vacancy.id,
          hardFilterPassed: false,
          hardRejectReason: null,
          score: 0,
          summary: 'Scoring failed due to internal error',
          reasonsJson: [],
          strengthsJson: [],
          weaknessesJson: [],
          status: 'error',
          errorMessage: error?.message ?? 'Unknown error',
        },
      })

      await this.logsService.createApiLog({
        accountId: candidate.accountId,
        provider: 'internal',
        action: 'scoring.run',
        requestJson: requestPayload,
        responseJson: {
          message: 'Scoring failed',
          errorMessage: error?.message ?? 'Unknown error',
          scoringRunId: scoringRun.id,
        },
        status: 'error',
      })

      throw error
    }
  }
}