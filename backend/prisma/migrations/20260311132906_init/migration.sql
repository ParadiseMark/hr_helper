-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "amo_account_id" TEXT,
    "amo_domain" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vacancies" (
    "id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hh_vacancy_id" TEXT,
    "job_description" TEXT,
    "company_description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vacancies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidates" (
    "id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "vacancy_id" TEXT,
    "amo_lead_id" TEXT,
    "hh_candidate_id" TEXT,
    "full_name" TEXT NOT NULL,
    "age" INTEGER,
    "gender" TEXT,
    "city" TEXT,
    "salary_expectation" INTEGER,
    "resume_text" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scoring_runs" (
    "id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "vacancy_id" TEXT NOT NULL,
    "hard_filter_passed" BOOLEAN,
    "hard_reject_reason" TEXT,
    "score" INTEGER,
    "summary" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scoring_runs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "vacancies" ADD CONSTRAINT "vacancies_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_vacancy_id_fkey" FOREIGN KEY ("vacancy_id") REFERENCES "vacancies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scoring_runs" ADD CONSTRAINT "scoring_runs_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scoring_runs" ADD CONSTRAINT "scoring_runs_vacancy_id_fkey" FOREIGN KEY ("vacancy_id") REFERENCES "vacancies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
