# HR Scoring Widget — Backend

Автоматический первичный скрининг кандидатов: hh.ru → amoCRM → AI scoring → writeback.

## Quick Start (локальная разработка)

### 1. Запустить PostgreSQL

```bash
# из корня проекта
docker compose up -d postgres
```

### 2. Установить зависимости

```bash
cd backend
npm ci
```

### 3. Настроить окружение

```bash
cp .env.example .env
# заполнить значения в .env
```

### 4. Применить миграции и seed

```bash
npx prisma migrate deploy
npx prisma generate
npx tsx prisma/seed.ts
```

### 5. Запустить сервер

```bash
npm run start:dev
```

Сервер будет доступен на `http://localhost:3000`.

### 6. Проверить

```bash
curl http://localhost:3000/health
```

---

## Запуск через Docker (всё в контейнерах)

```bash
# из корня проекта
docker compose up -d
```

Это поднимет PostgreSQL + backend. После старта применить миграции:

```bash
docker compose exec backend npx prisma migrate deploy
```

---

## Аутентификация

Все API-запросы (кроме публичных) требуют заголовок:

```
x-api-key: <ваш_ключ>
```

Seed создаёт демо-ключ: `hrsw_seed_demo_key_for_local_development_only`

Сгенерировать новый ключ:

```bash
curl -X POST -H "x-api-key: <текущий_ключ>" http://localhost:3000/accounts/<id>/rotate-api-key
```

---

## Переменные окружения

| Переменная | Обязательная | Описание |
|---|---|---|
| `APP_PORT` | нет | Порт сервера (по умолчанию 3000) |
| `APP_ENV` | нет | Окружение: development / production |
| `DATABASE_URL` | **да** | PostgreSQL connection string |
| `OPENAI_API_KEY` | **да** | Ключ OpenAI для AI-скоринга |
| `OPENAI_MODEL` | нет | Модель OpenAI (по умолчанию gpt-4.1-mini) |
| `AMO_CLIENT_ID` | **да** | Client ID интеграции amoCRM |
| `AMO_CLIENT_SECRET` | **да** | Client Secret интеграции amoCRM |
| `AMO_REDIRECT_URI` | **да** | URL для OAuth callback amoCRM |
| `AMOCRM_FIELD_AI_SCORE_ID` | **да** | ID кастомного поля AI Score |
| `AMOCRM_FIELD_AI_SCORING_STATUS_ID` | **да** | ID кастомного поля AI Scoring Status |
| `AMOCRM_FIELD_AI_HARD_FILTER_STATUS_ID` | **да** | ID кастомного поля AI Hard Filter Status |
| `AMOCRM_FIELD_AI_LAST_SCORED_AT_ID` | **да** | ID кастомного поля AI Last Scored At |
| `HH_CLIENT_ID` | нет* | Client ID приложения hh.ru |
| `HH_CLIENT_SECRET` | нет* | Client Secret приложения hh.ru |

\* hh.ru-интеграция пока не реализована.

---

## API Endpoints

### Публичные (без API-ключа)

| Метод | Путь | Описание |
|---|---|---|
| GET | `/health` | Health check |
| POST | `/webhooks/amocrm/candidate-created` | Webhook от amoCRM |
| POST | `/integrations/amocrm/callback` | OAuth callback amoCRM |

### Защищённые (требуют `x-api-key`)

| Метод | Путь | Описание |
|---|---|---|
| **Accounts** | | |
| GET | `/accounts` | Список аккаунтов |
| POST | `/accounts/:id/rotate-api-key` | Перегенерировать API-ключ |
| **Vacancies** | | |
| POST | `/vacancies` | Создать вакансию |
| GET | `/vacancies` | Список вакансий |
| GET | `/vacancies/:id` | Вакансия с правилами |
| PUT | `/vacancies/:id` | Обновить вакансию |
| GET | `/vacancies/:id/hard-rules` | Hard-фильтры вакансии |
| PUT | `/vacancies/:id/hard-rules` | Создать/обновить hard-фильтры |
| GET | `/vacancies/:id/soft-rules` | Soft-критерии вакансии |
| PUT | `/vacancies/:id/soft-rules` | Создать/обновить soft-критерии |
| GET | `/vacancies/:id/auto-reject-settings` | Настройки автоотказа |
| PUT | `/vacancies/:id/auto-reject-settings` | Создать/обновить настройки автоотказа |
| **Candidates** | | |
| POST | `/candidates` | Создать кандидата |
| GET | `/candidates` | Список кандидатов |
| GET | `/candidates/:id` | Кандидат по ID |
| **Scoring** | | |
| POST | `/scoring/run` | Запустить скоринг (`{ accountId, amoLeadId }`) |
| GET | `/scoring/history/:candidateId` | История скорингов кандидата |
| **Integrations** | | |
| GET | `/integrations/amocrm/auth-url?accountId=` | URL для OAuth amoCRM |
| GET | `/integrations/status?accountId=` | Статус интеграций |

---

## Кастомные поля amoCRM

Создайте в amoCRM 4 кастомных поля для сделок:

| Поле | Тип | Переменная |
|---|---|---|
| AI Score | Число | `AMOCRM_FIELD_AI_SCORE_ID` |
| AI Scoring Status | Текст | `AMOCRM_FIELD_AI_SCORING_STATUS_ID` |
| AI Hard Filter Status | Текст | `AMOCRM_FIELD_AI_HARD_FILTER_STATUS_ID` |
| AI Last Scored At | Дата | `AMOCRM_FIELD_AI_LAST_SCORED_AT_ID` |

ID полей укажите в `.env`.

---

## Архитектура

```
┌─────────────┐    ┌──────────────┐    ┌──────────────┐
│   hh.ru     │───>│   Backend    │───>│   amoCRM     │
│  (кандидаты)│    │   (NestJS)   │    │  (writeback) │
└─────────────┘    └──────┬───────┘    └──────────────┘
                          │
                   ┌──────┴───────┐
                   │  PostgreSQL  │
                   └──────┬───────┘
                          │
                   ┌──────┴───────┐
                   │   OpenAI     │
                   │  (scoring)   │
                   └──────────────┘
```

### Модули

| Модуль | Назначение |
|---|---|
| `AuthModule` | API-key аутентификация |
| `AccountsModule` | Управление аккаунтами |
| `VacanciesModule` | CRUD вакансий + hard/soft rules + auto-reject settings |
| `CandidatesModule` | CRUD кандидатов |
| `ScoringModule` | Hard filter → AI scoring → сохранение результата |
| `AmoIntegrationModule` | OAuth, API-клиент, writeback в amoCRM |
| `IntegrationsModule` | OAuth endpoints, статус интеграций |
| `WebhooksModule` | Приём вебхуков от amoCRM |
| `LogsModule` | Логирование API-вызовов |
| `HealthModule` | Health check |

### Scoring Pipeline

```
Webhook / POST /scoring/run
       │
       ▼
 Найти кандидата + вакансию
       │
       ▼
 Загрузить hard_rules из БД
       │
       ▼
 Hard Filter (13 проверок)
       │
   ┌───┴───┐
   │fail   │pass
   ▼       ▼
 reject   AI Scoring (OpenAI + soft_rules)
   │       │
   ▼       ▼
 Сохранить ScoringRun в БД
       │
       ▼
 Writeback в amoCRM (поля + note)
```

---

## Деплой

Подробная инструкция: [`../DEPLOYMENT_GUIDE.md`](../DEPLOYMENT_GUIDE.md)

### Обновление на сервере

```bash
cd ~/apps/hr_helper && git pull
cd backend && npm ci
npx prisma migrate deploy
npx prisma generate
npm run build
pm2 restart hr-scoring-api --update-env
```
