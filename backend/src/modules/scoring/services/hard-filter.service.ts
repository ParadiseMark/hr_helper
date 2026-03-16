import { Injectable } from '@nestjs/common'
import {
  HardFilterCandidateInput,
  HardFilterResult,
  HardFilterRules,
} from '../types/hard-filter.types'

@Injectable()
export class HardFilterService {
  evaluate(
    candidate: HardFilterCandidateInput,
    rules: HardFilterRules,
  ): HardFilterResult {
    if (rules.ageFrom !== undefined && candidate.age !== null && candidate.age !== undefined) {
      if (candidate.age < rules.ageFrom) {
        return {
          passed: false,
          reason: `Возраст ниже минимального порога (${rules.ageFrom})`,
        }
      }
    }

    if (rules.ageTo !== undefined && candidate.age !== null && candidate.age !== undefined) {
      if (candidate.age > rules.ageTo) {
        return {
          passed: false,
          reason: `Возраст выше максимального порога (${rules.ageTo})`,
        }
      }
    }

    if (
      rules.allowedCities &&
      rules.allowedCities.length > 0 &&
      candidate.city &&
      !rules.allowedCities.includes(candidate.city)
    ) {
      return {
        passed: false,
        reason: `Город ${candidate.city} не входит в список разрешённых`,
      }
    }

    return {
      passed: true,
    }
  }
}