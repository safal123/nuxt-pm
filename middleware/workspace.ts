export default defineNuxtRouteMiddleware(async (to) => {
  const userStore = useUserStore();
  const workspaceStore = useWorkspaceStore();

  if (!userStore.user) await userStore.me();
  if (!workspaceStore.workspaces.length) await workspaceStore.fetchWorkspaces();

  const routeWorkspaceId = String(to.params.workspaceId || "");
  let workspaceId =
    routeWorkspaceId ||
    userStore.user?.activeWorkspaceId ||
    workspaceStore.workspaces[0]?.id ||
    "";

  if (!workspaceStore.workspaces.length) {
    const workspace = await workspaceStore.createWorkspace({ name: "My Workspace" });
    workspaceId = workspace.id;
    await userStore.updateUser({ activeWorkspaceId: workspaceId });
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

  const known = workspaceStore.workspaces.find(
    (workspace: { id: string; createdBy?: string }) =>
      workspace.id === routeWorkspaceId,
  );
  if (known) {
    if (
      to.name === "workspace-billing" &&
      known.createdBy !== userStore.user?.id
    ) {
      return navigateTo(
        { name: "workspace-dashboard", params: { workspaceId: known.id } },
        { replace: true },
      );
    }
    return;
  }

  const fallback =
    userStore.user?.activeWorkspaceId || workspaceStore.workspaces[0]?.id;
  if (fallback && fallback !== routeWorkspaceId) {
    return navigateTo(
      { name: "workspace-dashboard", params: { workspaceId: fallback } },
      { replace: true },
    );
  }
});
