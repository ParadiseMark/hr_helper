-- AlterTable
ALTER TABLE "accounts" ADD COLUMN "api_key" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "accounts_api_key_key" ON "accounts"("api_key");
