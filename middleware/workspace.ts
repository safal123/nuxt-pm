export default defineNuxtRouteMiddleware(async (to) => {
  const userStore = useUserStore();
  const workspaceStore = useWorkspaceStore();
  const headers = import.meta.server
    ? useRequestHeaders(["cookie"])
    : undefined;

  if (!userStore.user) await userStore.me();
  if (!workspaceStore.workspaces.length) await workspaceStore.fetchWorkspaces();

  const routeWorkspaceId = String(to.params.workspaceId || "");
  let workspaceId =
    routeWorkspaceId ||
    userStore.user?.activeWorkspaceId ||
    workspaceStore.workspaces[0]?.id ||
    "";

  if (!workspaceStore.workspaces.length) {
    const result = await $fetch<{ data: { workspace: { id: string } } }>(
      "/api/workspaces",
      {
        method: "POST",
        body: { name: "My Workspace" },
        headers,
      },
    );
    workspaceId = result.data.workspace.id;
    await userStore.updateUser({ activeWorkspaceId: workspaceId });
    await workspaceStore.fetchWorkspaces();
  }

  if (!workspaceId) {
    return navigateTo("/", { replace: true });
  }

  const atWorkspaceIndex =
    !routeWorkspaceId || to.path === `/w/${routeWorkspaceId}`;

  if (atWorkspaceIndex) {
    return navigateTo(
      { name: "workspace-dashboard", params: { workspaceId } },
      { replace: true },
    );
  }

  const known = workspaceStore.workspaces.some(
    (workspace: { id: string }) => workspace.id === routeWorkspaceId,
  );
  if (known) return;

  const fallback =
    userStore.user?.activeWorkspaceId || workspaceStore.workspaces[0]?.id;
  if (fallback && fallback !== routeWorkspaceId) {
    return navigateTo(
      { name: "workspace-dashboard", params: { workspaceId: fallback } },
      { replace: true },
    );
  }
});
