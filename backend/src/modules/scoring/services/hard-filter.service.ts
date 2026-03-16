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
    const checks: Array<() => HardFilterResult | null> = [
      () => this.checkAge(candidate, rules),
      () => this.checkGender(candidate, rules),
      () => this.checkCity(candidate, rules),
      () => this.checkSalary(candidate, rules),
      () => this.checkExperience(candidate, rules),
      () => this.checkRelocation(candidate, rules),
      () => this.checkCitizenship(candidate, rules),
      () => this.checkLanguages(candidate, rules),
      () => this.checkEmploymentType(candidate, rules),
      () => this.checkWorkSchedule(candidate, rules),
      () => this.checkRequiredSkills(candidate, rules),
      () => this.checkStopFactors(candidate, rules),
    ]

    for (const check of checks) {
      const result = check()
      if (result && !result.passed) return result
    }

    return { passed: true }
  }

  private checkAge(c: HardFilterCandidateInput, r: HardFilterRules): HardFilterResult | null {
    if (c.age == null) return null
    if (r.ageFrom != null && c.age < r.ageFrom) {
      return { passed: false, reason: `Возраст (${c.age}) ниже минимального порога (${r.ageFrom})` }
    }
    if (r.ageTo != null && c.age > r.ageTo) {
      return { passed: false, reason: `Возраст (${c.age}) выше максимального порога (${r.ageTo})` }
    }
    return null
  }

  private checkGender(c: HardFilterCandidateInput, r: HardFilterRules): HardFilterResult | null {
    if (!r.gender || !c.gender) return null
    if (c.gender.toLowerCase() !== r.gender.toLowerCase()) {
      return { passed: false, reason: `Пол "${c.gender}" не соответствует требованию "${r.gender}"` }
    }
    return null
  }

  private checkCity(c: HardFilterCandidateInput, r: HardFilterRules): HardFilterResult | null {
    if (!r.allowedCities?.length || !c.city) return null
    const normalizedCities = r.allowedCities.map((s) => s.toLowerCase())
    if (!normalizedCities.includes(c.city.toLowerCase())) {
      return { passed: false, reason: `Город "${c.city}" не входит в список разрешённых` }
    }
    return null
  }

  private checkSalary(c: HardFilterCandidateInput, r: HardFilterRules): HardFilterResult | null {
    if (r.salaryMax == null || c.salaryExpectation == null) return null
    if (c.salaryExpectation > r.salaryMax) {
      return { passed: false, reason: `Зарплатные ожидания (${c.salaryExpectation}) превышают максимум (${r.salaryMax})` }
    }
    return null
  }

  private checkExperience(c: HardFilterCandidateInput, r: HardFilterRules): HardFilterResult | null {
    if (r.minExperienceYears == null || c.experienceYears == null) return null
    if (c.experienceYears < r.minExperienceYears) {
      return { passed: false, reason: `Опыт работы (${c.experienceYears} лет) ниже минимального (${r.minExperienceYears})` }
    }
    return null
  }

  private checkRelocation(c: HardFilterCandidateInput, r: HardFilterRules): HardFilterResult | null {
    if (r.relocationRequired == null || c.relocationReady == null) return null
    if (r.relocationRequired && !c.relocationReady) {
      return { passed: false, reason: 'Кандидат не готов к релокации' }
    }
    return null
  }

  private checkCitizenship(c: HardFilterCandidateInput, r: HardFilterRules): HardFilterResult | null {
    if (!r.citizenshipRequirements?.length || !c.citizenship) return null
    const allowed = r.citizenshipRequirements.map((s) => s.toLowerCase())
    if (!allowed.includes(c.citizenship.toLowerCase())) {
      return { passed: false, reason: `Гражданство "${c.citizenship}" не соответствует требованиям` }
    }
    return null
  }

  private checkLanguages(c: HardFilterCandidateInput, r: HardFilterRules): HardFilterResult | null {
    if (!r.languageRequirements?.length || !c.languages?.length) return null
    const candidateLangs = c.languages.map((s) => s.toLowerCase())
    for (const req of r.languageRequirements) {
      if (!candidateLangs.includes(req.toLowerCase())) {
        return { passed: false, reason: `Отсутствует требуемый язык: "${req}"` }
      }
    }
    return null
  }

  private checkEmploymentType(c: HardFilterCandidateInput, r: HardFilterRules): HardFilterResult | null {
    if (!r.employmentType || !c.employmentType) return null
    if (c.employmentType.toLowerCase() !== r.employmentType.toLowerCase()) {
      return { passed: false, reason: `Тип занятости "${c.employmentType}" не соответствует требованию "${r.employmentType}"` }
    }
    return null
  }

  private checkWorkSchedule(c: HardFilterCandidateInput, r: HardFilterRules): HardFilterResult | null {
    if (!r.workSchedule || !c.workSchedule) return null
    if (c.workSchedule.toLowerCase() !== r.workSchedule.toLowerCase()) {
      return { passed: false, reason: `График работы "${c.workSchedule}" не соответствует требованию "${r.workSchedule}"` }
    }
    return null
  }

  private checkRequiredSkills(c: HardFilterCandidateInput, r: HardFilterRules): HardFilterResult | null {
    if (!r.requiredSkills?.length || !c.skills?.length) return null
    const candidateSkills = c.skills.map((s) => s.toLowerCase())
    const missing = r.requiredSkills.filter((s) => !candidateSkills.includes(s.toLowerCase()))
    if (missing.length > 0) {
      return { passed: false, reason: `Отсутствуют обязательные навыки: ${missing.join(', ')}` }
    }
    return null
  }

  private checkStopFactors(c: HardFilterCandidateInput, r: HardFilterRules): HardFilterResult | null {
    if (!r.stopFactors?.length || !c.skills?.length) return null
    const candidateSkills = c.skills.map((s) => s.toLowerCase())
    for (const factor of r.stopFactors) {
      if (candidateSkills.includes(factor.toLowerCase())) {
        return { passed: false, reason: `Обнаружен стоп-фактор: "${factor}"` }
      }
    }
    return null
  }
}