export interface HardFilterRules {
  ageFrom?: number | null
  ageTo?: number | null
  gender?: string | null
  allowedCities?: string[] | null
  relocationRequired?: boolean | null
  minExperienceYears?: number | null
  salaryMax?: number | null
  languageRequirements?: string[] | null
  citizenshipRequirements?: string[] | null
  employmentType?: string | null
  workSchedule?: string | null
  requiredSkills?: string[] | null
  stopFactors?: string[] | null
}

export interface HardFilterCandidateInput {
  age?: number | null
  gender?: string | null
  city?: string | null
  salaryExpectation?: number | null
  experienceYears?: number | null
  citizenship?: string | null
  languages?: string[] | null
  skills?: string[] | null
  employmentType?: string | null
  workSchedule?: string | null
  relocationReady?: boolean | null
}

export interface HardFilterResult {
  passed: boolean
  reason?: string
}