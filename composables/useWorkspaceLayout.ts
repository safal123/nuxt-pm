import type { Project, Workspace } from "~/types";
import {
  workspaceBackgroundStyle,
  workspaceSidebarStyle,
  workspaceThemeCss,
} from "~/utils/task-colors";

export const useWorkspaceLayout = () => {
  const route = useRoute();
  const workspaceStore = useWorkspaceStore();
  const userStore = useUserStore();
  const modalsStore = useModalsStore();

  const workspaceId = computed(() =>
    String(
      route.params.workspaceId ||
      workspaceStore.activeWorkspaceId ||
      userStore.user?.activeWorkspaceId ||
      "",
    ),
  );

  const workspaceBackground = computed(() =>
    workspaceBackgroundStyle(
      workspaceStore.activeWorkspace?.settings?.backgroundColor,
    ),
  );

  const sidebarBackground = computed(() =>
    workspaceSidebarStyle(
      workspaceStore.activeWorkspace?.settings?.backgroundColor,
    ),
  );

  const workspaceColorId = computed(
    () => workspaceStore.activeWorkspace?.settings?.backgroundColor,
  );

  useHead({
    htmlAttrs: {
      style: computed(() => workspaceThemeCss(workspaceColorId.value)),
    },
  });

  const pageTitle = computed(() => {
    const path = route.path;
    if (path.includes("/archived")) return "Archive";
    if (path.includes("/activities")) return "Activities";
    if (path.includes("/emails")) return "Emails";
    if (path.includes("/settings")) return "Settings";
    const projectId = route.params.projectId;
    if (projectId) {
      return (
        workspaceStore.activeWorkspace?.projects?.find(
          (project: Project) => project.id === projectId,
        )?.name || "Project"
      );
    }
    if (path.endsWith("/projects")) return "Projects";
    return "Dashboard";
  });

  const openMembers = () => modalsStore.openModal("workspaceMembers");
  const openInvite = () => modalsStore.openModal("workspaceInvite");
  const openCreateProject = () =>
    modalsStore.openModal("createProject", {
      workspaceId: workspaceId.value,
    });

  const initialize = async () => {
    if (!userStore.user) await userStore.me();
    if (!workspaceStore.workspaces.length) {
      await workspaceStore.fetchWorkspaces();
    }

    if (
      workspaceId.value &&
      workspaceStore.workspaces.some(
        (workspace: Workspace) => workspace.id === workspaceId.value,
      ) &&
      workspaceStore.activeWorkspaceId !== workspaceId.value
    ) {
      await workspaceStore.setActiveWorkspace(workspaceId.value);
    }
  };

  return {
    workspaceId,
    workspaceBackground,
    sidebarBackground,
    pageTitle,
    openMembers,
    openInvite,
    openCreateProject,
    initialize,
  };
};
