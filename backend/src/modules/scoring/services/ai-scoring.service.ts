import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { LogsService } from '../../logs/logs.service'
import {
  AiScoringCandidateInput,
  AiScoringResult,
  AiScoringSoftRulesInput,
  AiScoringVacancyInput,
} from '../types/ai-scoring.types'

type OpenAiScoringSchema = {
  score: number
  summary: string
  strengths: string[]
  weaknesses: string[]
  reasons: string[]
}

@Injectable()
export class AiScoringService {
  private readonly logger = new Logger(AiScoringService.name)

  constructor(
    private readonly configService: ConfigService,
    private readonly logsService: LogsService,
  ) {}

  async evaluate(
    candidate: AiScoringCandidateInput,
    vacancy: AiScoringVacancyInput,
    softRules?: AiScoringSoftRulesInput | null,
    accountId?: string | null,
  ): Promise<AiScoringResult> {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY')
    const model = this.configService.get<string>('OPENAI_MODEL') ?? 'gpt-4.1-mini'

    if (!apiKey) {
      throw new InternalServerErrorException('OPENAI_API_KEY is not configured')
    }

    const prompt = this.buildPrompt(candidate, vacancy, softRules)
    const requestBody = this.buildRequestBody(model, prompt)

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)

    try {
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        signal: controller.signal,
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new InternalServerErrorException(
          `OpenAI request failed: ${response.status} ${errorText}`,
        )
      }

      const rawResponse = await response.json()
      const rawText = this.extractTextFromResponse(rawResponse)

      if (!rawText) {
        throw new InternalServerErrorException(
          'OpenAI response did not contain text output',
        )
      }

      let parsed: OpenAiScoringSchema
      try {
        parsed = JSON.parse(rawText) as OpenAiScoringSchema
      } catch {
        throw new InternalServerErrorException(
          'Failed to parse OpenAI structured response',
        )
      }

      const normalized: AiScoringResult = {
        score: this.normalizeScore(parsed.score),
        summary: parsed.summary || 'AI summary is empty',
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
        weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
        reasons: Array.isArray(parsed.reasons) ? parsed.reasons : [],
      }

      await this.logsService.createApiLog({
        accountId: accountId ?? null,
        provider: 'openai',
        action: 'ai-scoring.evaluate',
        requestJson: { model, promptLength: prompt.length },
        responseJson: { raw: rawText, normalized },
        status: 'success',
      })

      return normalized
    } catch (error: any) {
      const message = error?.name === 'AbortError'
        ? 'OpenAI request timed out after 15 seconds'
        : error?.message ?? 'Unknown OpenAI error'

      await this.logsService.createApiLog({
        accountId: accountId ?? null,
        provider: 'openai',
        action: 'ai-scoring.evaluate',
        requestJson: { model, promptLength: prompt.length },
        responseJson: { error: message },
        status: 'error',
      }).catch((logErr) => this.logger.warn('Failed to log OpenAI error', logErr))

      if (error?.name === 'AbortError') {
        throw new InternalServerErrorException(message)
      }
      throw error
    } finally {
      clearTimeout(timeout)
    }
  }

  private buildPrompt(
    candidate: AiScoringCandidateInput,
    vacancy: AiScoringVacancyInput,
    softRules?: AiScoringSoftRulesInput | null,
  ): string {
    const candidateName = candidate.fullName ?? 'Кандидат'
    const resumeText = candidate.resumeText?.trim() || 'Текст резюме отсутствует'
    const vacancyName = vacancy.name ?? 'Вакансия'

    let prompt = `
Ты HR-ассистент, который оценивает кандидата по вакансии.

Твоя задача:
1. Проанализировать резюме кандидата.
2. Сопоставить его с вакансией и критериями оценки.
3. Вернуть ТОЛЬКО JSON по заданной схеме.

Правила:
- score: целое число от 0 до 100
- summary: 1–3 предложения на русском языке
- strengths: от 1 до 5 коротких пунктов
- weaknesses: от 1 до 5 коротких пунктов
- reasons: от 1 до 5 причин, почему выставлен такой score
- не выдумывай факты, которых нет в резюме
- если данных мало, так и напиши
- ответ должен быть полезен рекрутеру

ДАННЫЕ КАНДИДАТА:
Имя: ${candidateName}
Возраст: ${candidate.age ?? 'не указан'}
Город: ${candidate.city ?? 'не указан'}
Резюме:
${resumeText}

ДАННЫЕ ВАКАНСИИ:
Название: ${vacancyName}
Описание вакансии:
${vacancy.jobDescription ?? 'Описание вакансии отсутствует'}
Описание компании:
${vacancy.companyDescription ?? 'Описание компании отсутствует'}`

    if (softRules) {
      prompt += '\n\nКРИТЕРИИ ОЦЕНКИ ОТ HR:'
      if (softRules.mustHave?.length) {
        prompt += `\nОбязательные требования (must have): ${softRules.mustHave.join('; ')}`
      }
      if (softRules.niceToHave?.length) {
        prompt += `\nЖелательные требования (nice to have): ${softRules.niceToHave.join('; ')}`
      }
      if (softRules.advantages?.length) {
        prompt += `\nПреимущества кандидата (оцени выше, если есть): ${softRules.advantages.join('; ')}`
      }
      if (softRules.risks?.length) {
        prompt += `\nРиски (оцени ниже, если обнаружены): ${softRules.risks.join('; ')}`
      }
      if (softRules.hrComments) {
        prompt += `\nКомментарий HR: ${softRules.hrComments}`
      }
    }

    return prompt.trim()
  }

  private buildRequestBody(model: string, prompt: string) {
    return {
      model,
      input: prompt,
      temperature: 0.2,
      text: {
        format: {
          type: 'json_schema',
          name: 'ai_scoring_result',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              score: { type: 'integer', minimum: 0, maximum: 100 },
              summary: { type: 'string' },
              strengths: { type: 'array', items: { type: 'string' } },
              weaknesses: { type: 'array', items: { type: 'string' } },
              reasons: { type: 'array', items: { type: 'string' } },
            },
            required: ['score', 'summary', 'strengths', 'weaknesses', 'reasons'],
          },
        },
      },
    }
  }

  private extractTextFromResponse(data: any): string | null {
    if (typeof data?.output_text === 'string' && data.output_text.trim()) {
      return data.output_text
    }
    if (!Array.isArray(data?.output)) return null
    for (const item of data.output) {
      if (!Array.isArray(item?.content)) continue
      for (const contentItem of item.content) {
        if (
          contentItem?.type === 'output_text' &&
          typeof contentItem?.text === 'string' &&
          contentItem.text.trim()
        ) {
          return contentItem.text
        }
      }
    }
    return null
  }

  private normalizeScore(score: number): number {
    if (!Number.isFinite(score)) return 0
    if (score < 0) return 0
    if (score > 100) return 100
    return Math.round(score)
  }
}