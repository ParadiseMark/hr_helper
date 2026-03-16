export type AmoScoringStatus =
  | 'pending'
  | 'hard_rejected'
  | 'scored'
  | 'soft_rejected'
  | 'error'

export type AmoHardFilterStatus =
  | 'not_checked'
  | 'passed'
  | 'failed'

export interface AmoCrmWritebackPayload {
  accountId: string
  amoLeadId: string
  fields: {
    aiScore: number | null
    aiScoringStatus: AmoScoringStatus
    aiHardFilterStatus: AmoHardFilterStatus
    aiLastScoredAt: string
  }
  noteText: string
}