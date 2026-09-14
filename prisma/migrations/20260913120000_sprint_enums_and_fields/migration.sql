-- CreateEnum
CREATE TYPE "SprintStatus" AS ENUM ('PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "WorkspaceRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "ProjectRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- Task enums
ALTER TABLE "tasks" ALTER COLUMN "priority" DROP DEFAULT;
ALTER TABLE "tasks" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "tasks" ALTER COLUMN "priority" TYPE "TaskPriority" USING "priority"::"TaskPriority";
ALTER TABLE "tasks" ALTER COLUMN "status" TYPE "TaskStatus" USING "status"::"TaskStatus";
ALTER TABLE "tasks" ALTER COLUMN "priority" SET DEFAULT 'MEDIUM';
ALTER TABLE "tasks" ALTER COLUMN "status" SET DEFAULT 'TODO';

-- Role enums
ALTER TABLE "workspace_members" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "workspace_members" ALTER COLUMN "role" TYPE "WorkspaceRole" USING "role"::"WorkspaceRole";
ALTER TABLE "workspace_members" ALTER COLUMN "role" SET DEFAULT 'MEMBER';

ALTER TABLE "workspace_invites" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "workspace_invites" ALTER COLUMN "role" TYPE "WorkspaceRole" USING "role"::"WorkspaceRole";
ALTER TABLE "workspace_invites" ALTER COLUMN "role" SET DEFAULT 'MEMBER';

ALTER TABLE "project_members" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "project_members" ALTER COLUMN "role" TYPE "ProjectRole" USING "role"::"ProjectRole";
ALTER TABLE "project_members" ALTER COLUMN "role" SET DEFAULT 'MEMBER';

-- Sprint status: CLOSED becomes COMPLETED
DROP INDEX IF EXISTS "sprints_project_id_active_uidx";
UPDATE "sprints" SET "status" = 'COMPLETED' WHERE "status" = 'CLOSED';

ALTER TABLE "sprints" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "sprints" ALTER COLUMN "status" TYPE "SprintStatus" USING ("status"::text)::"SprintStatus";
ALTER TABLE "sprints" ALTER COLUMN "status" SET DEFAULT 'PLANNED'::"SprintStatus";

CREATE UNIQUE INDEX "sprints_project_id_active_uidx" ON "sprints"("project_id") WHERE "status" = 'ACTIVE'::"SprintStatus";

-- Sprint date fields
ALTER TABLE "sprints" RENAME COLUMN "start_date" TO "planned_start_at";
ALTER TABLE "sprints" RENAME COLUMN "end_date" TO "planned_end_at";
ALTER TABLE "sprints" RENAME COLUMN "closed_at" TO "completed_at";
ALTER TABLE "sprints" ADD COLUMN "started_at" TIMESTAMP(3);

-- Sprint number + creator
ALTER TABLE "sprints" ADD COLUMN "number" INTEGER;
ALTER TABLE "sprints" ADD COLUMN "created_by" TEXT;

WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY "project_id" ORDER BY "createdAt" ASC) AS n
  FROM "sprints"
)
UPDATE "sprints"
SET "number" = numbered.n
FROM numbered
WHERE "sprints".id = numbered.id;

UPDATE "sprints"
SET "created_by" = "projects"."created_by"
FROM "projects"
WHERE "sprints"."project_id" = "projects"."id";

UPDATE "sprints"
SET "started_at" = "createdAt"
WHERE "status" IN ('ACTIVE'::"SprintStatus", 'COMPLETED'::"SprintStatus") AND "started_at" IS NULL;

ALTER TABLE "sprints" ALTER COLUMN "number" SET NOT NULL;
ALTER TABLE "sprints" ALTER COLUMN "created_by" SET NOT NULL;

CREATE UNIQUE INDEX "sprints_project_id_number_key" ON "sprints"("project_id", "number");

ALTER TABLE "sprints"
ADD CONSTRAINT "sprints_created_by_fkey"
FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
