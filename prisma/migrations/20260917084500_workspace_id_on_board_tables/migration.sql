-- Denormalize workspace_id onto board rows and pin project names per workspace.

-- 1. Add columns (nullable until backfill)
ALTER TABLE "task_columns" ADD COLUMN "workspace_id" TEXT;
ALTER TABLE "sprints" ADD COLUMN "workspace_id" TEXT;
ALTER TABLE "tasks" ADD COLUMN "workspace_id" TEXT;
ALTER TABLE "labels" ADD COLUMN "workspace_id" TEXT;
ALTER TABLE "project_members" ADD COLUMN "workspace_id" TEXT;
ALTER TABLE "task_comments" ADD COLUMN "workspace_id" TEXT;
ALTER TABLE "task_likes" ADD COLUMN "workspace_id" TEXT;
ALTER TABLE "task_members" ADD COLUMN "workspace_id" TEXT;
ALTER TABLE "attachments" ADD COLUMN "workspace_id" TEXT;

-- 2. Backfill from parents
UPDATE "task_columns" AS c
SET "workspace_id" = p."workspace_id"
FROM "projects" AS p
WHERE c."project_id" = p."id";

UPDATE "sprints" AS s
SET "workspace_id" = p."workspace_id"
FROM "projects" AS p
WHERE s."project_id" = p."id";

UPDATE "tasks" AS t
SET "workspace_id" = p."workspace_id"
FROM "projects" AS p
WHERE t."project_id" = p."id";

UPDATE "labels" AS l
SET "workspace_id" = p."workspace_id"
FROM "projects" AS p
WHERE l."project_id" = p."id";

UPDATE "project_members" AS m
SET "workspace_id" = p."workspace_id"
FROM "projects" AS p
WHERE m."project_id" = p."id";

UPDATE "task_comments" AS c
SET "workspace_id" = t."workspace_id"
FROM "tasks" AS t
WHERE c."task_id" = t."id";

UPDATE "task_likes" AS l
SET "workspace_id" = t."workspace_id"
FROM "tasks" AS t
WHERE l."task_id" = t."id";

UPDATE "task_members" AS m
SET "workspace_id" = t."workspace_id"
FROM "tasks" AS t
WHERE m."task_id" = t."id";

UPDATE "attachments" AS a
SET "workspace_id" = t."workspace_id"
FROM "tasks" AS t
WHERE a."attachable_type" = 'Task' AND a."attachable_id" = t."id";

UPDATE "attachments" AS a
SET "workspace_id" = p."workspace_id"
FROM "projects" AS p
WHERE a."attachable_type" = 'Project' AND a."attachable_id" = p."id";

UPDATE "attachments" AS a
SET "workspace_id" = a."attachable_id"
WHERE a."attachable_type" = 'Workspace';

UPDATE "attachments" AS a
SET "workspace_id" = c."workspace_id"
FROM "task_comments" AS c
WHERE a."attachable_type" = 'Comment' AND a."attachable_id" = c."id";

DELETE FROM "attachments" WHERE "workspace_id" IS NULL;

-- 3. Require workspace_id
ALTER TABLE "task_columns" ALTER COLUMN "workspace_id" SET NOT NULL;
ALTER TABLE "sprints" ALTER COLUMN "workspace_id" SET NOT NULL;
ALTER TABLE "tasks" ALTER COLUMN "workspace_id" SET NOT NULL;
ALTER TABLE "labels" ALTER COLUMN "workspace_id" SET NOT NULL;
ALTER TABLE "project_members" ALTER COLUMN "workspace_id" SET NOT NULL;
ALTER TABLE "task_comments" ALTER COLUMN "workspace_id" SET NOT NULL;
ALTER TABLE "task_likes" ALTER COLUMN "workspace_id" SET NOT NULL;
ALTER TABLE "task_members" ALTER COLUMN "workspace_id" SET NOT NULL;
ALTER TABLE "attachments" ALTER COLUMN "workspace_id" SET NOT NULL;

-- 4. Project names unique per workspace (suffix duplicates)
WITH ranked AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "workspace_id", "name"
      ORDER BY "createdAt" ASC, "id" ASC
    ) AS n
  FROM "projects"
)
UPDATE "projects" AS p
SET "name" = p."name" || ' (' || ranked.n || ')'
FROM ranked
WHERE p."id" = ranked."id" AND ranked.n > 1;

CREATE UNIQUE INDEX "projects_id_workspace_id_key" ON "projects"("id", "workspace_id");
CREATE UNIQUE INDEX "projects_workspace_id_name_key" ON "projects"("workspace_id", "name");
CREATE UNIQUE INDEX "tasks_id_workspace_id_key" ON "tasks"("id", "workspace_id");

CREATE INDEX "task_columns_workspace_id_idx" ON "task_columns"("workspace_id");
CREATE INDEX "sprints_workspace_id_idx" ON "sprints"("workspace_id");
CREATE INDEX "tasks_workspace_id_idx" ON "tasks"("workspace_id");
CREATE INDEX "labels_workspace_id_idx" ON "labels"("workspace_id");
CREATE INDEX "project_members_workspace_id_idx" ON "project_members"("workspace_id");
CREATE INDEX "task_comments_workspace_id_idx" ON "task_comments"("workspace_id");
CREATE INDEX "task_likes_workspace_id_idx" ON "task_likes"("workspace_id");
CREATE INDEX "task_members_workspace_id_idx" ON "task_members"("workspace_id");
CREATE INDEX "attachments_workspace_id_idx" ON "attachments"("workspace_id");

-- 5. Composite FKs so a child cannot point at a project/task in another workspace
ALTER TABLE "task_columns" DROP CONSTRAINT "task_columns_project_id_fkey";
ALTER TABLE "task_columns"
  ADD CONSTRAINT "task_columns_project_id_workspace_id_fkey"
  FOREIGN KEY ("project_id", "workspace_id") REFERENCES "projects"("id", "workspace_id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "sprints" DROP CONSTRAINT "sprints_project_id_fkey";
ALTER TABLE "sprints"
  ADD CONSTRAINT "sprints_project_id_workspace_id_fkey"
  FOREIGN KEY ("project_id", "workspace_id") REFERENCES "projects"("id", "workspace_id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tasks" DROP CONSTRAINT "tasks_project_id_fkey";
ALTER TABLE "tasks"
  ADD CONSTRAINT "tasks_project_id_workspace_id_fkey"
  FOREIGN KEY ("project_id", "workspace_id") REFERENCES "projects"("id", "workspace_id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "labels" DROP CONSTRAINT "labels_project_id_fkey";
ALTER TABLE "labels"
  ADD CONSTRAINT "labels_project_id_workspace_id_fkey"
  FOREIGN KEY ("project_id", "workspace_id") REFERENCES "projects"("id", "workspace_id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "project_members" DROP CONSTRAINT "project_members_project_id_fkey";
ALTER TABLE "project_members"
  ADD CONSTRAINT "project_members_project_id_workspace_id_fkey"
  FOREIGN KEY ("project_id", "workspace_id") REFERENCES "projects"("id", "workspace_id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "task_comments" DROP CONSTRAINT "task_comments_task_id_fkey";
ALTER TABLE "task_comments"
  ADD CONSTRAINT "task_comments_task_id_workspace_id_fkey"
  FOREIGN KEY ("task_id", "workspace_id") REFERENCES "tasks"("id", "workspace_id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "task_likes" DROP CONSTRAINT "task_likes_task_id_fkey";
ALTER TABLE "task_likes"
  ADD CONSTRAINT "task_likes_task_id_workspace_id_fkey"
  FOREIGN KEY ("task_id", "workspace_id") REFERENCES "tasks"("id", "workspace_id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "task_members" DROP CONSTRAINT "task_members_task_id_fkey";
ALTER TABLE "task_members"
  ADD CONSTRAINT "task_members_task_id_workspace_id_fkey"
  FOREIGN KEY ("task_id", "workspace_id") REFERENCES "tasks"("id", "workspace_id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "attachments"
  ADD CONSTRAINT "attachments_workspace_id_fkey"
  FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
