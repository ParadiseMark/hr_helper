import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { ScoringOrchestratorService } from './services/scoring-orchestrator.service'

@Injectable()
export class ScoringService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scoringOrchestratorService: ScoringOrchestratorService,
  ) {}

  async runScoring(candidateId: string, vacancyId: string) {
    return this.scoringOrchestratorService.run(candidateId, vacancyId)
  }

  async runScoringByAmoLead(dto: { accountId: string; amoLeadId: string }) {
    const candidate = await this.prisma.candidate.findFirst({
      where: {
        accountId: dto.accountId,
        amoLeadId: dto.amoLeadId,
      },
      include: {
        vacancy: true,
      },
    })

    if (!candidate) {
      throw new NotFoundException(
        `Candidate not found for accountId="${dto.accountId}" and amoLeadId="${dto.amoLeadId}"`,
      )
    }

    if (!candidate.vacancyId) {
      throw new NotFoundException(
        `Candidate "${candidate.id}" does not have vacancyId`,
      )
    }

    return this.scoringOrchestratorService.run(
      candidate.id,
      candidate.vacancyId,
    )
  }
}