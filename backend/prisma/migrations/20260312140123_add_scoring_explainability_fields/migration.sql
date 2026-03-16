-- AlterTable
ALTER TABLE "scoring_runs" ADD COLUMN     "reasons_json" JSONB,
ADD COLUMN     "strengths_json" JSONB,
ADD COLUMN     "weaknesses_json" JSONB;
