-- CreateEnum
CREATE TYPE "CalendarProvider" AS ENUM ('LOCAL', 'GOOGLE', 'MICROSOFT');

-- CreateTable
CREATE TABLE "calendar_events" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "start_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3) NOT NULL,
    "all_day" BOOLEAN NOT NULL DEFAULT false,
    "color" TEXT,
    "workspace_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "provider" "CalendarProvider" NOT NULL DEFAULT 'LOCAL',
    "external_id" TEXT,
    "external_url" TEXT,
    "synced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "calendar_events_project_id_start_at_idx" ON "calendar_events"("project_id", "start_at");

-- CreateIndex
CREATE INDEX "calendar_events_workspace_id_idx" ON "calendar_events"("workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_events_provider_external_id_key" ON "calendar_events"("provider", "external_id");

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_project_id_workspace_id_fkey" FOREIGN KEY ("project_id", "workspace_id") REFERENCES "projects"("id", "workspace_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Tenant isolation, same rule as every workspace table (see 20261003100000_tenant_rls).
GRANT SELECT, INSERT, UPDATE, DELETE ON "calendar_events" TO app_tenant;
ALTER TABLE "calendar_events" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_workspace ON "calendar_events" FOR ALL TO app_tenant
  USING (app_can_access_workspace(workspace_id))
  WITH CHECK (app_can_access_workspace(workspace_id));
