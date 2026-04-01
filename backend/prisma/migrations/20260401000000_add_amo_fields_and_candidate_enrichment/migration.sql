-- Add amo_fields_json to accounts
ALTER TABLE "accounts" ADD COLUMN "amo_fields_json" JSONB;

-- Add pipeline/stage/manager to vacancies
ALTER TABLE "vacancies" ADD COLUMN "amo_pipeline_id" TEXT;
ALTER TABLE "vacancies" ADD COLUMN "amo_status_id" TEXT;
ALTER TABLE "vacancies" ADD COLUMN "amo_responsible_user_id" TEXT;

-- Add enriched fields to candidates
ALTER TABLE "candidates" ADD COLUMN "amo_contact_id" TEXT;
ALTER TABLE "candidates" ADD COLUMN "phone" TEXT;
ALTER TABLE "candidates" ADD COLUMN "email" TEXT;
ALTER TABLE "candidates" ADD COLUMN "hh_resume_url" TEXT;
ALTER TABLE "candidates" ADD COLUMN "hh_profile_url" TEXT;
ALTER TABLE "candidates" ADD COLUMN "experience_months" INTEGER;
ALTER TABLE "candidates" ADD COLUMN "employment_type" TEXT;
ALTER TABLE "candidates" ADD COLUMN "work_schedule" TEXT;
ALTER TABLE "candidates" ADD COLUMN "skills_json" JSONB;
ALTER TABLE "candidates" ADD COLUMN "languages_json" JSONB;
ALTER TABLE "candidates" ADD COLUMN "citizenship_json" JSONB;
ALTER TABLE "candidates" ADD COLUMN "cover_letter" TEXT;
