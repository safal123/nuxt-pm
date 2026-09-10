import type { WorkspaceActivity } from "~/types";
import { api } from "~/lib/api";
import { pageKeys } from "~/lib/query";

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

const emptySummary = {
  stats: emptyStats,
  activity: [] as WorkspaceSummaryActivity[],
};

export const useWorkspaceSummary = (
  workspaceId: MaybeRefOrGetter<string>,
) => {
  const id = computed(() => toValue(workspaceId) || "none");

  const { data, status, error, refresh } = useAsyncData(
    pageKeys.summary(id.value),
    async () => {
      const workspaceIdValue = toValue(workspaceId);
      if (!workspaceIdValue) return emptySummary;
      const result = await api<{
        stats: WorkspaceSummaryStats;
        activity: WorkspaceSummaryActivity[];
      }>(`/api/workspaces/${workspaceIdValue}/summary`);
      return {
        stats: result.stats ?? emptyStats,
        activity: result.activity ?? [],
      };
    },
    {
      watch: [id],
      default: () => emptySummary,
    },
  );

  return {
    stats: computed(() => data.value?.stats ?? emptyStats),
    activity: computed(() => data.value?.activity ?? []),
    pending: computed(() => status.value === "pending"),
    error,
    refresh,
  };
};
