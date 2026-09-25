-- Polymorphic AI briefings. Task columns move here; one row per subject.

CREATE TABLE "ai_summaries" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "attachable_type" TEXT NOT NULL,
    "attachable_id" TEXT NOT NULL,
    "progress" TEXT NOT NULL,
    "further_action" TEXT NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL,
    "generated_by" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_summaries_pkey" PRIMARY KEY ("id")
);

INSERT INTO "ai_summaries" (
    "id",
    "workspace_id",
    "attachable_type",
    "attachable_id",
    "progress",
    "further_action",
    "generated_at",
    "generated_by",
    "createdAt",
    "updatedAt"
)
SELECT
    'sum_' || t."id",
    t."workspace_id",
    'Task',
    t."id",
    t."summary_progress",
    t."summary_further_action",
    COALESCE(t."summary_generated_at", t."updatedAt"),
    NULL,
    COALESCE(t."summary_generated_at", t."updatedAt"),
    COALESCE(t."summary_generated_at", t."updatedAt")
FROM "tasks" AS t
WHERE t."summary_progress" IS NOT NULL
  AND t."summary_further_action" IS NOT NULL;

CREATE UNIQUE INDEX "ai_summaries_attachable_type_attachable_id_key"
  ON "ai_summaries"("attachable_type", "attachable_id");
CREATE INDEX "ai_summaries_workspace_id_idx" ON "ai_summaries"("workspace_id");
CREATE INDEX "ai_summaries_generated_at_idx" ON "ai_summaries"("generated_at");

ALTER TABLE "ai_summaries"
  ADD CONSTRAINT "ai_summaries_workspace_id_fkey"
  FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ai_summaries"
  ADD CONSTRAINT "ai_summaries_generated_by_fkey"
  FOREIGN KEY ("generated_by") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "tasks" DROP COLUMN "summary_progress";
ALTER TABLE "tasks" DROP COLUMN "summary_further_action";
ALTER TABLE "tasks" DROP COLUMN "summary_generated_at";
