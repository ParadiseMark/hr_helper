interface BuildScoringNoteParams {
  status: 'hard_rejected' | 'scored' | 'soft_rejected' | 'error'
  score?: number | null
  threshold?: number | null
  summary?: string | null
  reasons?: string[]
  strengths?: string[]
  weaknesses?: string[]
  hardRejectReason?: string | null
  autoRejectStatus?: string
}

export function buildScoringNote(params: BuildScoringNoteParams): string {
  const lines: string[] = []

  if (params.status === 'hard_rejected') {
    lines.push('AI Hard Reject')
    lines.push(`Reason: ${params.hardRejectReason ?? 'Hard filter failed'}`)
    lines.push(
      `Auto reject in hh.ru: ${params.autoRejectStatus ?? 'disabled'}`,
    )

    return lines.join('\n')
  }

  if (params.status === 'soft_rejected') {
    lines.push('AI Soft Reject')
    lines.push(`Score: ${params.score ?? 0}/100`)

    if (params.threshold !== undefined && params.threshold !== null) {
      lines.push(`Threshold: ${params.threshold}`)
    }

    lines.push('')
    lines.push('Summary:')
    lines.push(params.summary ?? 'No summary')
    lines.push('')

    lines.push('Reasons:')
    for (const item of params.reasons ?? []) {
      lines.push(`- ${item}`)
    }

    lines.push('')
    lines.push('Strengths:')
    for (const item of params.strengths ?? []) {
      lines.push(`- ${item}`)
    }

    lines.push('')
    lines.push('Weaknesses:')
    for (const item of params.weaknesses ?? []) {
      lines.push(`- ${item}`)
    }

    lines.push('')
    lines.push(`Auto reject in hh.ru: ${params.autoRejectStatus ?? 'disabled'}`)

    return lines.join('\n')
  }

  if (params.status === 'error') {
    lines.push('AI Scoring Error')
    lines.push(params.summary ?? 'Scoring failed due to internal error')
    return lines.join('\n')
  }

  lines.push('AI Scoring Result')
  lines.push(`Score: ${params.score ?? 0}/100`)
  lines.push('')
  lines.push('Summary:')
  lines.push(params.summary ?? 'No summary')
  lines.push('')

  lines.push('Reasons:')
  for (const item of params.reasons ?? []) {
    lines.push(`- ${item}`)
  }

  lines.push('')
  lines.push('Strengths:')
  for (const item of params.strengths ?? []) {
    lines.push(`- ${item}`)
  }

  lines.push('')
  lines.push('Weaknesses:')
  for (const item of params.weaknesses ?? []) {
    lines.push(`- ${item}`)
  }

  lines.push('')
  lines.push(`Auto reject in hh.ru: ${params.autoRejectStatus ?? 'not triggered'}`)

  return lines.join('\n')
}