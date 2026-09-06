import type { WorkspaceActivity } from "~/types";

export type WorkspaceSummaryStats = {
  liveProjects: number;
  archivedProjects: number;
  openTasks: number;
  doneTasks: number;
};

export type WorkspaceSummaryActivity = Pick<
  WorkspaceActivity,
  "id" | "type" | "message" | "createdAt" | "user" | "task" | "project"
>;

const emptyStats: WorkspaceSummaryStats = {
  liveProjects: 0,
  archivedProjects: 0,
  openTasks: 0,
  doneTasks: 0,
};

export const useWorkspaceSummary = (
  workspaceId: MaybeRefOrGetter<string>,
) => {
  const { data, status, error } = useAsyncData(
    `workspace-summary-${toValue(workspaceId) || "none"}`,
    async () => {
      const id = toValue(workspaceId);
      if (!id) {
        return { stats: emptyStats, activity: [] as WorkspaceSummaryActivity[] };
      }
      const headers = import.meta.server
        ? useRequestHeaders(["cookie"])
        : undefined;
      const result = await $fetch<{
        data: {
          stats: WorkspaceSummaryStats;
          activity: WorkspaceSummaryActivity[];
        };
      }>(`/api/workspaces/${id}/summary`, { headers });
      return {
        stats: result?.data?.stats ?? emptyStats,
        activity: result?.data?.activity ?? [],
      };
    },
    { watch: [() => toValue(workspaceId)] },
  );

  return {
    stats: computed(() => data.value?.stats ?? emptyStats),
    activity: computed(() => data.value?.activity ?? []),
    pending: computed(() => status.value === "pending"),
    error,
  };
};
