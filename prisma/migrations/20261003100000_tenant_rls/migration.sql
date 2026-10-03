-- Tenant isolation with Postgres row-level security.
--
-- Request handlers run their queries as `app_tenant` with `app.user_id` set
-- (see lib/prisma.ts). The owning/migration role is not affected by these
-- policies, which keeps Better Auth, webhooks, seeds and migrations working.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_tenant') THEN
    CREATE ROLE app_tenant NOLOGIN;
  END IF;
END
$$;

-- The app connects as CURRENT_USER and switches with `SET LOCAL ROLE app_tenant`.
GRANT app_tenant TO CURRENT_USER;

GRANT USAGE ON SCHEMA public TO app_tenant;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_tenant;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_tenant;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_tenant;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO app_tenant;

-- Auth secrets and migration history are never touched from a tenant request.
REVOKE ALL ON "sessions", "accounts", "verifications", "_prisma_migrations" FROM app_tenant;

CREATE OR REPLACE FUNCTION app_current_user_id() RETURNS text
  LANGUAGE sql STABLE
AS $$ SELECT NULLIF(current_setting('app.user_id', true), '') $$;

-- SECURITY DEFINER: runs as the owner, so it can read workspaces/members
-- without recursing into their own policies.
CREATE OR REPLACE FUNCTION app_can_access_workspace(target_workspace_id text) RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspaces w
    WHERE w.id = target_workspace_id AND w.created_by = app_current_user_id()
  ) OR EXISTS (
    SELECT 1 FROM workspace_members m
    WHERE m.workspace_id = target_workspace_id AND m.user_id = app_current_user_id()
  )
$$;

-- workspaces: the creator check is inline so INSERT ... RETURNING can see the new row.
ALTER TABLE "workspaces" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_select ON "workspaces" FOR SELECT TO app_tenant
  USING (created_by = app_current_user_id() OR app_can_access_workspace(id));
CREATE POLICY tenant_insert ON "workspaces" FOR INSERT TO app_tenant
  WITH CHECK (created_by = app_current_user_id());
CREATE POLICY tenant_update ON "workspaces" FOR UPDATE TO app_tenant
  USING (app_can_access_workspace(id))
  WITH CHECK (app_can_access_workspace(id));
CREATE POLICY tenant_delete ON "workspaces" FOR DELETE TO app_tenant
  USING (app_can_access_workspace(id));

-- Every table that carries workspace_id.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'workspace_settings', 'workspace_members', 'workspace_invites',
    'project_members', 'projects', 'sprints', 'task_columns', 'tasks',
    'task_comments', 'attachments', 'ai_summaries', 'task_likes',
    'task_members', 'labels', 'activities', 'email_logs'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY tenant_workspace ON %I FOR ALL TO app_tenant
         USING (app_can_access_workspace(workspace_id))
         WITH CHECK (app_can_access_workspace(workspace_id))',
      t
    );
  END LOOP;
END
$$;

-- AI chat is private to each user inside the workspace.
ALTER TABLE "ai_chat_messages" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_owner ON "ai_chat_messages" FOR ALL TO app_tenant
  USING (user_id = app_current_user_id() AND app_can_access_workspace(workspace_id))
  WITH CHECK (user_id = app_current_user_id() AND app_can_access_workspace(workspace_id));

-- task_labels has no workspace_id; scope through its task.
ALTER TABLE "task_labels" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_task ON "task_labels" FOR ALL TO app_tenant
  USING (EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.id = task_labels.task_id AND app_can_access_workspace(t.workspace_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.id = task_labels.task_id AND app_can_access_workspace(t.workspace_id)
  ));

-- Plan limits read the workspace owner's subscription; writes stay with the user.
ALTER TABLE "subscriptions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_select ON "subscriptions" FOR SELECT TO app_tenant
  USING (
    user_id = app_current_user_id()
    OR EXISTS (
      SELECT 1 FROM workspaces w
      WHERE w.created_by = subscriptions.user_id AND app_can_access_workspace(w.id)
    )
  );
CREATE POLICY tenant_write ON "subscriptions" FOR ALL TO app_tenant
  USING (user_id = app_current_user_id())
  WITH CHECK (user_id = app_current_user_id());

ALTER TABLE "billing_events" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_owner ON "billing_events" FOR ALL TO app_tenant
  USING (user_id = app_current_user_id())
  WITH CHECK (user_id = app_current_user_id());
