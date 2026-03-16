import { Body, Controller, Post } from '@nestjs/common';
import { ScoringService } from './scoring.service';
import { RunScoringByAmoDto } from './dto/run-scoring-by-amo.dto';

@Controller('scoring')
export class ScoringController {
  constructor(private readonly scoringService: ScoringService) {}

  @Post('run')
  runScoring(@Body() dto: RunScoringByAmoDto) {
    return this.scoringService.runScoringByAmoLead(dto);
  }
}