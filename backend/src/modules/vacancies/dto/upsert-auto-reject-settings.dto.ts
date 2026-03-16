import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator'

export class UpsertAutoRejectSettingsDto {
  @IsOptional()
  @IsBoolean()
  rejectOnHardFail?: boolean

  @IsOptional()
  @IsBoolean()
  rejectOnSoftFail?: boolean

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  softRejectThreshold?: number

  @IsOptional()
  @IsString()
  rejectReasonTemplateHard?: string

  @IsOptional()
  @IsString()
  rejectReasonTemplateSoft?: string
}
