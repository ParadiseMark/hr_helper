import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator'

export class CreateVacancyDto {
  @IsString()
  @IsNotEmpty()
  accountId: string

  @IsString()
  @IsNotEmpty()
  name: string

  @IsOptional()
  @IsString()
  hhVacancyId?: string

  @IsOptional()
  @IsString()
  jobDescription?: string

  @IsOptional()
  @IsString()
  companyDescription?: string

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}