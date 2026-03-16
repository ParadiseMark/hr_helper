-- CreateTable
CREATE TABLE "api_logs" (
    "id" TEXT NOT NULL,
    "account_id" TEXT,
    "provider" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "request_json" JSONB,
    "response_json" JSONB,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_logs_pkey" PRIMARY KEY ("id")
);
