-- Persist generated card summaries (progress + next step).

ALTER TABLE "tasks" ADD COLUMN "summary_progress" TEXT;
ALTER TABLE "tasks" ADD COLUMN "summary_further_action" TEXT;
ALTER TABLE "tasks" ADD COLUMN "summary_generated_at" TIMESTAMP(3);
