import { IsBoolean, IsOptional, IsString } from 'class-validator'

export class UpdateVacancyDto {
  @IsOptional()
  @IsString()
  name?: string

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
