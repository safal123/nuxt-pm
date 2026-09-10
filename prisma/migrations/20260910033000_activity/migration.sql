-- Activity is workspace-scoped. Task and project are optional subjects.
ALTER TABLE "task_activities" RENAME TO "activities";

ALTER TABLE "activities" RENAME CONSTRAINT "task_activities_pkey" TO "activities_pkey";
ALTER TABLE "activities" RENAME CONSTRAINT "task_activities_task_id_fkey" TO "activities_task_id_fkey";
ALTER TABLE "activities" RENAME CONSTRAINT "task_activities_user_id_fkey" TO "activities_user_id_fkey";
ALTER INDEX "task_activities_task_id_createdAt_idx" RENAME TO "activities_task_id_createdAt_idx";

ALTER TABLE "activities" ADD COLUMN "workspace_id" TEXT;
ALTER TABLE "activities" ADD COLUMN "project_id" TEXT;

UPDATE "activities" AS activity
SET
  "workspace_id" = project."workspace_id",
  "project_id" = task."project_id"
FROM "tasks" AS task
INNER JOIN "projects" AS project ON project."id" = task."project_id"
WHERE activity."task_id" = task."id";

DELETE FROM "activities" WHERE "workspace_id" IS NULL;

ALTER TABLE "activities" ALTER COLUMN "workspace_id" SET NOT NULL;
ALTER TABLE "activities" ALTER COLUMN "task_id" DROP NOT NULL;

ALTER TABLE "activities" ADD CONSTRAINT "activities_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "activities" ADD CONSTRAINT "activities_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "activities_workspace_id_createdAt_idx" ON "activities"("workspace_id", "createdAt");
CREATE INDEX "activities_project_id_createdAt_idx" ON "activities"("project_id", "createdAt");
