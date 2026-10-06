-- CreateTable
CREATE TABLE "project_settings" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "default_view" TEXT NOT NULL DEFAULT 'board',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "project_settings_project_id_key" ON "project_settings"("project_id");

-- CreateIndex
CREATE INDEX "project_settings_workspace_id_idx" ON "project_settings"("workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_settings_project_id_workspace_id_key" ON "project_settings"("project_id", "workspace_id");

-- AddForeignKey
ALTER TABLE "project_settings" ADD CONSTRAINT "project_settings_project_id_workspace_id_fkey" FOREIGN KEY ("project_id", "workspace_id") REFERENCES "projects"("id", "workspace_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Tenant isolation, same rule as calendar_events.
GRANT SELECT, INSERT, UPDATE, DELETE ON "project_settings" TO app_tenant;
ALTER TABLE "project_settings" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_workspace ON "project_settings" FOR ALL TO app_tenant
  USING (app_can_access_workspace(workspace_id))
  WITH CHECK (app_can_access_workspace(workspace_id));
