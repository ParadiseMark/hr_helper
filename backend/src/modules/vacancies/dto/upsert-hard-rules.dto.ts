import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator'

export class UpsertHardRulesDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  ageFrom?: number

  @IsOptional()
  @IsInt()
  @Min(0)
  ageTo?: number

  @IsOptional()
  @IsString()
  gender?: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedCitiesJson?: string[]

  @IsOptional()
  @IsBoolean()
  relocationRequired?: boolean

  @IsOptional()
  @IsInt()
  @Min(0)
  minExperienceYears?: number

  @IsOptional()
  @IsInt()
  @Min(0)
  salaryMax?: number

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  languageRequirementsJson?: string[]

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  citizenshipRequirementsJson?: string[]

  @IsOptional()
  @IsString()
  employmentType?: string

  @IsOptional()
  @IsString()
  workSchedule?: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredSkillsJson?: string[]

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  stopFactorsJson?: string[]
}
