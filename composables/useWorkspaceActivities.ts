import { watchDebounced } from "@vueuse/core";
import { api } from "~/lib/api";
import type {
  WorkspaceActivitiesResponse,
  WorkspaceActivity,
} from "~/types";
import {
  ACTIVITY_PAGE_SIZE,
  ALL,
  defaultActivityFilters,
  isActivityKind,
} from "~/utils/activity";

export const useWorkspaceActivities = async () => {
  const workspaceStore = useWorkspaceStore();
  const { showEmailsInActivity } = useAppSettings();

  const filters = reactive(defaultActivityFilters());
  const page = ref(1);

  const activities = ref<WorkspaceActivity[]>([]);
  const projects = ref<WorkspaceActivitiesResponse["projects"]>([]);
  const tasks = ref<WorkspaceActivitiesResponse["tasks"]>([]);
  const total = ref(0);
  const loading = ref(true);
  const error = ref<string | null>(null);

  const pageSize = ACTIVITY_PAGE_SIZE;
  const kindQuery = computed(() =>
    filters.kind === ALL && !showEmailsInActivity.value ? "task" : filters.kind,
  );

  const rangeLabel = computed(() => {
    if (!total.value) return "0 events";
    const start = (page.value - 1) * pageSize + 1;
    const end = Math.min(page.value * pageSize, total.value);
    return `${start}–${end} of ${total.value}`;
  });

  let requestId = 0;
  let skipNextFetch = false;

  const fetchActivities = async () => {
    const workspaceId = workspaceStore.activeWorkspaceId;
    if (!workspaceId) {
      loading.value = false;
      activities.value = [];
      total.value = 0;
      return;
    }

    const id = ++requestId;
    loading.value = true;
    error.value = null;
    try {
      const result = await api<WorkspaceActivitiesResponse>(
        `/api/workspaces/${workspaceId}/activities`,
        {
          query: {
            projectId: filters.projectId,
            taskId: filters.taskId,
            kind: kindQuery.value,
            page: page.value,
            limit: pageSize,
          },
        },
      );
      if (id !== requestId) return;
      activities.value = result.activities ?? [];
      projects.value = result.projects ?? [];
      tasks.value = result.tasks ?? [];
      total.value = result.total ?? 0;
      if (result.page && result.page !== page.value) {
        skipNextFetch = true;
        page.value = result.page;
      }
    } catch (err: any) {
      if (id !== requestId) return;
      error.value =
        err?.data?.message || err?.message || "Could not load activity.";
      activities.value = [];
      total.value = 0;
    } finally {
      if (id === requestId) loading.value = false;
    }
  };

  const setProject = (projectId: string) => {
    filters.projectId = projectId;
    filters.taskId = ALL;
    page.value = 1;
  };

  const setTask = (taskId: string) => {
    filters.taskId = taskId;
    if (taskId !== ALL) filters.kind = "task";
    page.value = 1;
  };

  const setKind = (kind: string) => {
    if (!isActivityKind(kind)) return;
    filters.kind = kind;
    if (kind === "email") filters.taskId = ALL;
    page.value = 1;
  };

  await fetchActivities();

  watch(
    () => workspaceStore.activeWorkspaceId,
    (id, prev) => {
      if (!prev || id === prev) return;
      page.value = 1;
      Object.assign(filters, defaultActivityFilters());
    },
  );

  watchDebounced(
    () =>
      [
        workspaceStore.activeWorkspaceId,
        filters.projectId,
        filters.taskId,
        filters.kind,
        kindQuery.value,
        page.value,
      ] as const,
    (curr, prev) => {
      if (skipNextFetch) {
        skipNextFetch = false;
        return;
      }
      if (prev) {
        const filtersChanged =
          curr[0] !== prev[0] ||
          curr[1] !== prev[1] ||
          curr[2] !== prev[2] ||
          curr[3] !== prev[3] ||
          curr[4] !== prev[4];
        if (filtersChanged && curr[5] !== 1) {
          page.value = 1;
          return;
        }
      }
      void fetchActivities();
    },
    { debounce: 50 },
  );

  return {
    filters,
    page,
    pageSize,
    activities,
    projects,
    tasks,
    total,
    loading,
    error,
    rangeLabel,
    setProject,
    setTask,
    setKind,
    refresh: fetchActivities,
  };
};
