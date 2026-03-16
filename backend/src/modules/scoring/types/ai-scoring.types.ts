export interface AiScoringCandidateInput {
  fullName?: string | null
  age?: number | null
  city?: string | null
  resumeText?: string | null
}

export interface AiScoringVacancyInput {
  name?: string | null
  jobDescription?: string | null
  companyDescription?: string | null
}

export interface AiScoringResult {
  score: number
  summary: string
  strengths: string[]
  weaknesses: string[]
  reasons: string[]
}