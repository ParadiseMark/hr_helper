import { IsNotEmpty, IsString } from 'class-validator'

export class AmoCrmCandidateCreatedDto {
  @IsString()
  @IsNotEmpty()
  accountId: string

  @IsString()
  @IsNotEmpty()
  amoLeadId: string
}