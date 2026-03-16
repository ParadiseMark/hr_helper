import { IsArray, IsOptional, IsString } from 'class-validator'

export class UpsertSoftRulesDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mustHaveJson?: string[]

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  niceToHaveJson?: string[]

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  advantagesJson?: string[]

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  risksJson?: string[]

  @IsOptional()
  @IsString()
  hrComments?: string
}
