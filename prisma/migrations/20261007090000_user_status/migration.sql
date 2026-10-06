-- CreateTable
CREATE TABLE "user_status" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "availability" TEXT NOT NULL DEFAULT 'online',
    "emoji" TEXT,
    "text" TEXT,
    "clear_after" TEXT NOT NULL DEFAULT 'never',
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_status_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_status_user_id_key" ON "user_status"("user_id");

-- AddForeignKey
ALTER TABLE "user_status" ADD CONSTRAINT "user_status_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

GRANT SELECT, INSERT, UPDATE, DELETE ON "user_status" TO app_tenant;
ALTER TABLE "user_status" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_read ON "user_status" FOR SELECT TO app_tenant
  USING (
    user_id = app_current_user_id()
    OR EXISTS (
      SELECT 1 FROM workspace_members me
      JOIN workspace_members them ON me.workspace_id = them.workspace_id
      WHERE me.user_id = app_current_user_id()
        AND them.user_id = user_status.user_id
    )
  );

CREATE POLICY tenant_write ON "user_status" FOR ALL TO app_tenant
  USING (user_id = app_current_user_id())
  WITH CHECK (user_id = app_current_user_id());
