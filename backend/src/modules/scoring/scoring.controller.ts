import { Body, Controller, Get, Param, Post } from '@nestjs/common'
import { ScoringService } from './scoring.service'
import { RunScoringByAmoDto } from './dto/run-scoring-by-amo.dto'

@Controller('scoring')
export class ScoringController {
  constructor(private readonly scoringService: ScoringService) {}

  @Post('run')
  runScoring(@Body() dto: RunScoringByAmoDto) {
    return this.scoringService.runScoringByAmoLead(dto)
  }

  @Get('history/:candidateId')
  getHistory(@Param('candidateId') candidateId: string) {
    return this.scoringService.getHistory(candidateId)
  }
}