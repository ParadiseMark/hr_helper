import { IsNotEmpty, IsString } from 'class-validator';

export class RunScoringByAmoDto {
  @IsString()
  @IsNotEmpty()
  accountId: string;

  @IsString()
  @IsNotEmpty()
  amoLeadId: string;
}