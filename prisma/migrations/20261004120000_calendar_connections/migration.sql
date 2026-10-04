-- DropIndex
DROP INDEX "calendar_events_provider_external_id_key";

-- AlterTable
ALTER TABLE "calendar_events" ADD COLUMN     "connection_id" TEXT;

-- CreateTable
CREATE TABLE "calendar_connections" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "provider" "CalendarProvider" NOT NULL,
    "external_calendar_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "synced_from" TIMESTAMP(3),
    "synced_to" TIMESTAMP(3),
    "last_synced_at" TIMESTAMP(3),
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_connections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "calendar_connections_workspace_id_idx" ON "calendar_connections"("workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_connections_project_id_provider_external_calendar__key" ON "calendar_connections"("project_id", "provider", "external_calendar_id");

-- CreateIndex
CREATE INDEX "calendar_events_connection_id_start_at_idx" ON "calendar_events"("connection_id", "start_at");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_events_connection_id_external_id_key" ON "calendar_events"("connection_id", "external_id");

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "calendar_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_connections" ADD CONSTRAINT "calendar_connections_project_id_workspace_id_fkey" FOREIGN KEY ("project_id", "workspace_id") REFERENCES "projects"("id", "workspace_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_connections" ADD CONSTRAINT "calendar_connections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Tenant isolation, same rule as calendar_events.
GRANT SELECT, INSERT, UPDATE, DELETE ON "calendar_connections" TO app_tenant;
ALTER TABLE "calendar_connections" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_workspace ON "calendar_connections" FOR ALL TO app_tenant
  USING (app_can_access_workspace(workspace_id))
  WITH CHECK (app_can_access_workspace(workspace_id));
