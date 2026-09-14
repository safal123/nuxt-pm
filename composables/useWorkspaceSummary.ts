import type { WorkspaceActivity } from "~/types";
import { api } from "~/lib/api";
import type {
  ActivityPoint,
  ProjectWorkloadPoint,
  StatusPoint,
} from "~/utils/analytics";

export type WorkspaceSummaryStats = {
  liveProjects: number;
  archivedProjects: number;
  openTasks: number;
  doneTasks: number;
};

export type WorkspaceAnalytics = {
  activity: ActivityPoint[];
  statuses: StatusPoint[];
  projects: ProjectWorkloadPoint[];
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

const emptyAnalytics: WorkspaceAnalytics = {
  activity: [],
  statuses: [],
  projects: [],
};

export const useWorkspaceSummary = (
  workspaceId: MaybeRefOrGetter<string>,
) => {
  const { data, status, error } = useAsyncData(
    `workspace-summary-${toValue(workspaceId) || "none"}`,
    async () => {
      const id = toValue(workspaceId);
      if (!id) {
        return {
          stats: emptyStats,
          analytics: emptyAnalytics,
          activity: [] as WorkspaceSummaryActivity[],
        };
      }
      const result = await api<{
        stats: WorkspaceSummaryStats;
        analytics: WorkspaceAnalytics;
        activity: WorkspaceSummaryActivity[];
      }>(`/api/workspaces/${id}/summary`);
      return {
        stats: result.stats ?? emptyStats,
        analytics: result.analytics ?? emptyAnalytics,
        activity: result.activity ?? [],
      };
    },
    { watch: [() => toValue(workspaceId)] },
  );

  return {
    stats: computed(() => data.value?.stats ?? emptyStats),
    analytics: computed(() => data.value?.analytics ?? emptyAnalytics),
    activity: computed(() => data.value?.activity ?? []),
    pending: computed(() => status.value === "pending"),
    error,
  };
};
