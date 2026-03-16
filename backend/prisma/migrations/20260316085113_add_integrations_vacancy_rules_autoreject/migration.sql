-- AlterTable
ALTER TABLE "candidates" ADD COLUMN     "hh_response_id" TEXT,
ADD COLUMN     "raw_resume_json" JSONB;

-- AlterTable
ALTER TABLE "scoring_runs" ADD COLUMN     "auto_reject_status" TEXT,
ADD COLUMN     "auto_reject_triggered" BOOLEAN,
ADD COLUMN     "auto_reject_type" TEXT,
ADD COLUMN     "note_text" TEXT;

-- CreateTable
CREATE TABLE "integrations" (
    "id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "expires_at" TIMESTAMP(3),
    "meta_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vacancy_hard_rules" (
    "id" TEXT NOT NULL,
    "vacancy_id" TEXT NOT NULL,
    "age_from" INTEGER,
    "age_to" INTEGER,
    "gender" TEXT,
    "allowed_cities_json" JSONB,
    "relocation_required" BOOLEAN,
    "min_experience_years" INTEGER,
    "salary_max" INTEGER,
    "language_requirements_json" JSONB,
    "citizenship_requirements_json" JSONB,
    "employment_type" TEXT,
    "work_schedule" TEXT,
    "required_skills_json" JSONB,
    "stop_factors_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vacancy_hard_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vacancy_soft_rules" (
    "id" TEXT NOT NULL,
    "vacancy_id" TEXT NOT NULL,
    "must_have_json" JSONB,
    "nice_to_have_json" JSONB,
    "advantages_json" JSONB,
    "risks_json" JSONB,
    "hr_comments" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vacancy_soft_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vacancy_auto_reject_settings" (
    "id" TEXT NOT NULL,
    "vacancy_id" TEXT NOT NULL,
    "reject_on_hard_fail" BOOLEAN NOT NULL DEFAULT false,
    "reject_on_soft_fail" BOOLEAN NOT NULL DEFAULT false,
    "soft_reject_threshold" INTEGER,
    "reject_reason_template_hard" TEXT,
    "reject_reason_template_soft" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vacancy_auto_reject_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "integrations_account_id_provider_key" ON "integrations"("account_id", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "vacancy_hard_rules_vacancy_id_key" ON "vacancy_hard_rules"("vacancy_id");

-- CreateIndex
CREATE UNIQUE INDEX "vacancy_soft_rules_vacancy_id_key" ON "vacancy_soft_rules"("vacancy_id");

-- CreateIndex
CREATE UNIQUE INDEX "vacancy_auto_reject_settings_vacancy_id_key" ON "vacancy_auto_reject_settings"("vacancy_id");

-- AddForeignKey
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vacancy_hard_rules" ADD CONSTRAINT "vacancy_hard_rules_vacancy_id_fkey" FOREIGN KEY ("vacancy_id") REFERENCES "vacancies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vacancy_soft_rules" ADD CONSTRAINT "vacancy_soft_rules_vacancy_id_fkey" FOREIGN KEY ("vacancy_id") REFERENCES "vacancies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vacancy_auto_reject_settings" ADD CONSTRAINT "vacancy_auto_reject_settings_vacancy_id_fkey" FOREIGN KEY ("vacancy_id") REFERENCES "vacancies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
