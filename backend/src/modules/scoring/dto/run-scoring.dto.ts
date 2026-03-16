import { IsNotEmpty, IsString } from 'class-validator'

export class RunScoringDto {
  @IsString()
  @IsNotEmpty()
  candidateId: string

  @IsString()
  @IsNotEmpty()
  vacancyId: string
}