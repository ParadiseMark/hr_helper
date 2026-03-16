import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator'

export class CreateCandidateDto {
  @IsString()
  @IsNotEmpty()
  accountId: string

  @IsString()
  @IsNotEmpty()
  vacancyId: string

  @IsOptional()
  @IsString()
  amoLeadId?: string

  @IsOptional()
  @IsString()
  hhCandidateId?: string

  @IsString()
  @IsNotEmpty()
  fullName: string

  @IsOptional()
  @IsInt()
  @Min(0)
  age?: number

  @IsOptional()
  @IsString()
  gender?: string

  @IsOptional()
  @IsString()
  city?: string

  @IsOptional()
  @IsInt()
  @Min(0)
  salaryExpectation?: number

  @IsOptional()
  @IsString()
  resumeText?: string
}