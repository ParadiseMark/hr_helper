export interface HardFilterRules {
  ageFrom?: number
  ageTo?: number
  allowedCities?: string[]
}

export interface HardFilterCandidateInput {
  age?: number | null
  city?: string | null
}

export interface HardFilterResult {
  passed: boolean
  reason?: string
}