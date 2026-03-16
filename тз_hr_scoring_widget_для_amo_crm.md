# Техническое задание
## Проект: HR Scoring Widget для amoCRM

## 1. Краткое описание проекта
Нужно реализовать с нуля backend-систему для автоматического первичного скрининга кандидатов.

Целевой сценарий:
1. Кандидат откликается на вакансию на hh.ru.
2. Система получает данные кандидата и резюме.
3. Система создает или обновляет кандидата/сделку в amoCRM.
4. После попадания кандидата в amoCRM запускается scoring.
5. Система делает hard filter.
6. Если hard filter пройден — выполняется AI soft scoring через OpenAI.
7. Результат записывается обратно в amoCRM.
8. При включенной настройке и неподходящем результате система отправляет автоотказ в hh.ru.
9. Все действия и результаты сохраняются в БД и в технические логи.

Цель проекта — сократить ручную работу HR на этапе первичного отбора кандидатов.

---

## 2. Границы MVP

### В MVP входит
- интеграция с hh.ru
- интеграция с amoCRM
- интеграция с OpenAI
- backend API
- база данных PostgreSQL
- экран настроек вакансий внутри amoCRM widget settings
- hard filters
- soft scoring
- запись результата в поля сделки amoCRM
- запись подробного объяснения в note amoCRM
- история запусков scoring
- техническое логирование
- автоотказ в hh.ru
- настройка порога автоотказа
- мультиаккаунтная архитектура

### В MVP не входит
- Telegram
- массовый пересчет кандидатов
- сложная аналитика и BI
- отдельный внешний кабинет клиента
- ролевая модель внутри компании
- мобильное приложение

---

## 3. Основной бизнес-процесс

### 3.1 Источник кандидатов
В MVP единственный источник кандидатов — hh.ru.

### 3.2 Основной flow
1. Кандидат откликается на вакансию на hh.ru.
2. Backend получает отклик, данные кандидата и данные резюме.
3. Backend сохраняет кандидата в БД.
4. Backend создает или обновляет lead в amoCRM.
5. amoCRM отправляет webhook в backend.
6. Backend определяет кандидата по accountId + amoLeadId.
7. Backend определяет связанную вакансию.
8. Backend запускает hard filter.
9. Если hard filter fail:
   - soft scoring не запускается
   - результат сохраняется в БД
   - в amoCRM записываются статус и note
   - при включенной настройке отправляется reject в hh.ru
10. Если hard filter pass:
   - запускается AI soft scoring
   - AI возвращает score, summary, reasons, strengths, weaknesses
   - результат сохраняется в БД
   - результат записывается в amoCRM
   - если score ниже порога и включен автоотказ, отправляется reject в hh.ru

---

## 4. Пользовательские роли

### 4.1 HR / рекрутер
Может:
- создавать и редактировать вакансии
- задавать hard filters
- задавать soft scoring criteria
- задавать порог автоотказа
- включать и отключать автоотказ
- смотреть результат скоринга в карточке сделки

### 4.2 Администратор аккаунта
Может:
- подключать интеграции
- задавать глобальные настройки аккаунта
- настраивать токены и доступы
- просматривать журнал ошибок и историю запусков

---

## 5. Функциональные требования

### 5.1 Управление вакансиями
Для каждой вакансии необходимо хранить:
- название вакансии
- hh_vacancy_id
- описание вакансии
- описание компании
- активна ли вакансия
- hard filters
- soft scoring rules
- настройки автоотказа

### 5.2 Hard filters
Hard filters — это стоп-факторы. Они не влияют на score, а только отсеивают кандидатов.

Минимальный набор полей для MVP:
- age_from
- age_to
- gender
- allowed_cities
- relocation_required
- min_experience_years
- salary_max
- language_requirements
- citizenship_requirements
- employment_type
- work_schedule
- required_skills
- stop_factors

Логика:
- если хотя бы один обязательный hard filter не выполнен, кандидат получает hard reject
- soft scoring после этого не запускается

### 5.3 Soft scoring
Soft scoring запускается только после успешного hard filter.

На вход AI передается:
- resume_text
- job_description
- company_description
- must_have
- nice_to_have
- advantages
- risks
- hr_comments

AI должен возвращать:
- score: integer 0–100
- summary: string
- reasons: string[]
- strengths: string[]
- weaknesses: string[]

### 5.4 Автоотказ
Нужно поддержать два типа автоотказа:
1. hard auto reject
2. soft auto reject

Настройки по вакансии:
- reject_on_hard_fail: boolean
- reject_on_soft_fail: boolean
- soft_reject_threshold: integer | null
- reject_reason_template_hard: string | null
- reject_reason_template_soft: string | null

Логика:
- если hard filter fail и reject_on_hard_fail = true, отправляется reject в hh.ru
- если score < soft_reject_threshold и reject_on_soft_fail = true, отправляется reject в hh.ru
- если автоотказ выключен, система только сохраняет результат и ничего не отправляет в hh.ru

### 5.5 Запись результата в amoCRM
В карточку сделки amoCRM нужно записывать короткие значения.

Кастомные поля сделки:
- AI Score
- AI Scoring Status
- AI Hard Filter Status
- AI Last Scored At

Подробная информация всегда пишется в note.

### 5.6 История запусков
Каждый запуск scoring должен сохраняться как отдельная запись.
Нужно сохранять:
- hard filter result
- hard reject reason
- score
- summary
- reasons
- strengths
- weaknesses
- auto reject status
- итоговый статус запуска
- ошибку, если она была

### 5.7 Логирование
Нужно логировать:
- входящие webhook
- запросы в hh.ru
- запросы в amoCRM
- вызовы OpenAI
- итог scoring
- ошибки

---

## 6. Интерфейс внутри amoCRM

Нужен экран настроек вакансий внутри страницы advanced_settings виджета amoCRM.

### Блоки страницы настроек
1. Основное
   - название вакансии
   - hh vacancy id
   - описание вакансии
   - описание компании
   - active/inactive

2. Hard filters
   - все hard filter поля

3. Soft scoring
   - must_have
   - nice_to_have
   - advantages
   - risks
   - hr_comments

4. Auto reject
   - reject_on_hard_fail
   - reject_on_soft_fail
   - soft_reject_threshold
   - reject_reason_template_hard
   - reject_reason_template_soft

---

## 7. Требования к backend архитектуре

### 7.1 Стек
- Node.js
- NestJS
- TypeScript
- PostgreSQL
- Prisma
- OpenAI Responses API

### 7.2 Архитектура
Backend должен быть модульным.

Обязательные модули:
- AuthModule
- AccountsModule
- VacanciesModule
- CandidatesModule
- ScoringModule
- HhIntegrationModule
- AmoIntegrationModule
- LogsModule
- WebhooksModule
- HealthModule

### 7.3 Основной pipeline
1. Получить webhook / команду запуска
2. Определить accountId и amoLeadId
3. Найти кандидата
4. Найти вакансию
5. Выполнить hard filter
6. При success выполнить AI scoring
7. Сохранить scoring_run
8. Записать результат в amoCRM
9. При необходимости выполнить reject в hh.ru
10. Записать технические логи

---

## 8. Требования к OpenAI интеграции

Нужно использовать:
- OpenAI Responses API
- Structured Outputs
- JSON Schema response

Требования:
- модель должна возвращать строго валидный JSON
- ответ должен валидироваться на backend
- нужно логировать raw response и normalized response
- желательно предусмотреть fallback scoring при временной недоступности OpenAI
- запрос к OpenAI должен быть асинхронным и с timeout

Рекомендуемый JSON output:
- score
- summary
- reasons
- strengths
- weaknesses

---

## 9. Требования к hh.ru интеграции

Нужно реализовать:
- авторизацию приложения
- получение откликов / webhook / polling в зависимости от доступной схемы интеграции
- получение данных кандидата
- получение резюме
- сохранение hh_candidate_id и hh_response_id
- отправку reject кандидату
- логирование всех вызовов hh API

Важно:
- reject должен выполняться только через backend
- reject должен иметь статусы: sent / failed / disabled / not_needed

---

## 10. Требования к amoCRM интеграции

Нужно реализовать:
- OAuth авторизацию amoCRM
- создание или обновление lead
- хранение amoLeadId
- получение webhook из amoCRM
- обновление custom fields сделки
- создание note в сделке
- логирование всех вызовов amoCRM API

Webhook endpoint:
- POST /webhooks/amocrm/candidate-created

Ручной / системный запуск scoring:
- POST /scoring/run

Body:
- accountId
- amoLeadId

---

## 11. Требования к базе данных

Нужно реализовать следующие таблицы.

### accounts
- id
- company_name
- amocrm_account_id
- amocrm_domain
- status
- created_at
- updated_at

### integrations
- id
- account_id
- provider
- access_token
- refresh_token
- expires_at
- meta_json
- created_at
- updated_at

### vacancies
- id
- account_id
- name
- hh_vacancy_id
- job_description
- company_description
- is_active
- created_at
- updated_at

### vacancy_hard_rules
- id
- vacancy_id
- age_from
- age_to
- gender
- allowed_cities_json
- relocation_required
- min_experience_years
- salary_max
- language_requirements_json
- citizenship_requirements_json
- employment_type
- work_schedule
- required_skills_json
- stop_factors_json
- created_at
- updated_at

### vacancy_soft_rules
- id
- vacancy_id
- must_have_json
- nice_to_have_json
- advantages_json
- risks_json
- hr_comments
- created_at
- updated_at

### vacancy_auto_reject_settings
- id
- vacancy_id
- reject_on_hard_fail
- reject_on_soft_fail
- soft_reject_threshold
- reject_reason_template_hard
- reject_reason_template_soft
- created_at
- updated_at

### candidates
- id
- account_id
- vacancy_id
- amo_lead_id
- hh_candidate_id
- hh_response_id
- full_name
- age
- gender
- city
- salary_expectation
- resume_text
- raw_resume_json
- created_at
- updated_at

### scoring_runs
- id
- candidate_id
- vacancy_id
- hard_filter_passed
- hard_reject_reason
- score
- summary
- reasons_json
- strengths_json
- weaknesses_json
- auto_reject_triggered
- auto_reject_type
- auto_reject_status
- note_text
- status
- error_message
- created_at

### api_logs
- id
- account_id
- provider
- action
- request_json
- response_json
- status
- created_at

---

## 12. Требования к API

### Технические endpoints
- GET /health
- GET /integration/status

### Webhooks
- POST /webhooks/amocrm/candidate-created
- POST /webhooks/hh/*  (если потребуется выбранной схемой интеграции)

### Scoring
- POST /scoring/run
- GET /scoring/history/:candidateId

### Vacancies
- GET /vacancies
- POST /vacancies
- GET /vacancies/:id
- PUT /vacancies/:id

### Candidates
- POST /candidates
- GET /candidates/:id

Все входящие DTO должны проходить validation.

---

## 13. Требования к качеству и безопасности

Нужно обязательно реализовать:
- DTO validation
- глобальный ValidationPipe
- обработку ошибок 400 / 404 / 500
- централизованное логирование
- безопасное хранение токенов
- .env.example
- запрет коммита секретов в репозиторий
- timeout на внешние API
- retry или понятная стратегия повторов для writeback / reject

---

## 14. Нефункциональные требования

- Код должен быть чистым и модульным.
- Все критичные части должны быть покрыты понятной документацией.
- Должен быть README с инструкцией запуска проекта.
- Проект должен запускаться локально через Docker + PostgreSQL.
- Должна быть предусмотрена возможность деплоя на VPS.
- Архитектура должна поддерживать несколько аккаунтов amoCRM.

---

## 15. Что уже есть в текущем проектном контексте

В рамках текущих наработок уже подтверждены:
- NestJS backend
- PostgreSQL + Prisma
- модульная архитектура
- scoring pipeline
- запуск scoring через accountId + amoLeadId
- webhook endpoint из amoCRM
- writeback результата в amoCRM
- логирование scoring и api calls
- использование OpenAI для AI scoring

Но итоговый разработчик должен воспринимать это ТЗ как задачу на реализацию системы с нуля, а не как доработку только части кода.

---

## 16. Этапы реализации

### Этап 1. Базовая инфраструктура
- развернуть backend
- подключить PostgreSQL
- настроить Prisma
- описать схему БД
- поднять миграции
- подготовить seed

### Этап 2. Базовые модули
- accounts
- vacancies
- candidates
- logs
- health
- scoring skeleton

### Этап 3. Scoring engine
- hard filter
- AI scoring
- scoring orchestrator
- scoring history

### Этап 4. amoCRM integration
- OAuth
- создание/обновление lead
- webhook
- writeback результата
- note

### Этап 5. hh.ru integration
- получение кандидатов
- получение резюме
- привязка к vacancy
- reject API

### Этап 6. Настройки вакансий
- CRUD вакансий
- hard rules
- soft rules
- auto reject settings
- advanced_settings UI в amoCRM widget

### Этап 7. Стабилизация
- тестирование
- обработка ошибок
- fallback сценарии
- документация
- подготовка к деплою

---

## 17. Acceptance criteria

Проект считается готовым для MVP, если:
1. Система получает кандидата из hh.ru.
2. Система создает или обновляет lead в amoCRM.
3. webhook из amoCRM автоматически запускает scoring.
4. hard filter корректно останавливает неподходящих кандидатов.
5. soft scoring возвращает score и explainability.
6. результат записывается в custom fields amoCRM.
7. подробный note записывается в карточку сделки.
8. при включенном автоотказе система может отправить reject в hh.ru.
9. все действия сохраняются в scoring_runs и api_logs.
10. система работает минимум для одного тестового amoCRM account и поддерживает мультиаккаунтную архитектуру.

---

## 18. Что разработчик должен выдать на выходе

На выходе должен быть:
- исходный код backend
- миграции Prisma
- schema.prisma
- .env.example
- README по локальному запуску
- инструкция по деплою
- список необходимых переменных окружения
- список необходимых кастомных полей amoCRM
- описание webhook endpoints
- краткая схема архитектуры
- рабочий MVP flow: hh.ru → amoCRM → scoring → amoCRM → optional hh reject

