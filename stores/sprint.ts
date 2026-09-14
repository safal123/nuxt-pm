import { defineStore } from "pinia";
import type { Sprint, SprintFilter, SprintView, UnfinishedDestination } from "~/types";
import { isHistoricSprint } from "~/utils/sprints";
import { api } from "~/lib/api";
import { resolveSprintFilter, taskMatchesSprint } from "~/utils/sprints";

export const useSprintStore = defineStore("sprint", () => {
  const projectId = ref<string | null>(null);
  const sprints = ref<Sprint[]>([]);
  const current = ref<Sprint | null>(null);
  const view = ref<SprintView>("current");
  const loading = ref(false);
  const startOpen = ref(false);
  const completeOpen = ref(false);
  const editOpen = ref(false);

  const filter = computed<SprintFilter>(() =>
    resolveSprintFilter(view.value, current.value, sprints.value.length),
  );

  const boardSprintParam = computed(() => {
    if (view.value === "backlog") return "backlog";
    if (view.value !== "current") return view.value;
    return "current";
  });

  const closedSprints = computed(() =>
    sprints.value.filter((sprint) => isHistoricSprint(sprint.status)),
  );
  const plannedSprints = computed(() =>
    sprints.value.filter((sprint) => sprint.status === "PLANNED"),
  );

  const selectedSprint = computed(() => {
    if (view.value === "current") return current.value;
    if (view.value === "backlog") return null;
    return sprints.value.find((sprint) => sprint.id === view.value) ?? null;
  });

  const viewingClosed = computed(
    () =>
      !!selectedSprint.value && isHistoricSprint(selectedSprint.value.status),
  );

  const canAddCards = computed(() => !viewingClosed.value);

  const createSprintId = computed(() => {
    if (!canAddCards.value) return null;
    if (view.value === "backlog") return null;
    if (view.value === "current") return current.value?.id ?? null;
    return selectedSprint.value && isHistoricSprint(selectedSprint.value.status)
      ? null
      : selectedSprint.value?.id ?? null;
  });

  const matchesView = (task: { sprintId?: string | null }) =>
    taskMatchesSprint(task, filter.value);

  const reset = (id: string) => {
    if (projectId.value === id) return;
    projectId.value = id;
    view.value = "current";
    sprints.value = [];
    current.value = null;
  };

  const fetchSprints = async (id: string) => {
    reset(id);
    loading.value = true;
    try {
      const result = await api<{ sprints: Sprint[]; current: Sprint | null }>(
        `/api/projects/${id}/sprints`,
      );
      sprints.value = result.sprints ?? [];
      current.value = result.current ?? null;
    } finally {
      loading.value = false;
    }
  };

  const setView = (next: SprintView) => {
    view.value = next;
  };

  const startSprint = async (input: {
    name: string;
    goal?: string | null;
    plannedStartAt?: string | null;
    plannedEndAt?: string | null;
    pullBacklog?: boolean;
  }) => {
    if (!projectId.value) return null;
    const planned = [...plannedSprints.value].sort((a, b) => a.number - b.number)[0];
    const { sprint } = planned
      ? await api<{ sprint: Sprint }>(
          `/api/projects/${projectId.value}/sprints/${planned.id}`,
          {
            method: "PATCH",
            body: {
              name: input.name,
              goal: input.goal,
              plannedStartAt: input.plannedStartAt,
              plannedEndAt: input.plannedEndAt,
              status: "ACTIVE",
              pullBacklog: input.pullBacklog,
            },
          },
        )
      : await api<{ sprint: Sprint }>(
          `/api/projects/${projectId.value}/sprints`,
          { method: "POST", body: { ...input, start: true } },
        );
    if (projectId.value) await fetchSprints(projectId.value);
    if (sprint) {
      current.value = sprint.status === "ACTIVE" ? sprint : current.value;
      view.value = "current";
    }
    startOpen.value = false;
    return sprint;
  };

  const editableSprint = computed(() => {
    if (view.value === "backlog") return current.value;
    return selectedSprint.value ?? current.value;
  });

  const updateSprint = async (
    sprintId: string,
    input: {
      name?: string;
      goal?: string | null;
      plannedStartAt?: string | null;
      plannedEndAt?: string | null;
    },
  ) => {
    if (!projectId.value) return null;
    const { sprint } = await api<{ sprint: Sprint }>(
      `/api/projects/${projectId.value}/sprints/${sprintId}`,
      { method: "PATCH", body: input },
    );
    if (projectId.value) await fetchSprints(projectId.value);
    editOpen.value = false;
    return sprint;
  };

  const completeSprint = async (destination: UnfinishedDestination = "backlog") => {
    if (!projectId.value || !current.value) return null;
    const { sprint } = await api<{ sprint: Sprint }>(
      `/api/projects/${projectId.value}/sprints/${current.value.id}`,
      {
        method: "PATCH",
        body: { status: "COMPLETED", unfinishedDestination: destination },
      },
    );
    if (projectId.value) await fetchSprints(projectId.value);
    current.value = null;
    view.value = "current";
    completeOpen.value = false;
    return sprint;
  };

  return {
    projectId,
    sprints,
    current,
    view,
    loading,
    startOpen,
    completeOpen,
    editOpen,
    editableSprint,
    filter,
    boardSprintParam,
    closedSprints,
    plannedSprints,
    selectedSprint,
    viewingClosed,
    canAddCards,
    createSprintId,
    matchesView,
    fetchSprints,
    setView,
    startSprint,
    updateSprint,
    completeSprint,
  };
});
