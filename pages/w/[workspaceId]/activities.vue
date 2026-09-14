<script setup lang="ts">
import type { WorkspaceActivity } from "@/types";

definePageMeta({
  layout: "dashboard",
  name: "workspace-activities",
  middleware: "workspace",
});

const {
  filters,
  page,
  pageSize,
  activities,
  projects,
  tasks,
  total,
  summary,
  loading,
  error,
  rangeLabel,
  setProject,
  setTask,
  setKind,
  refresh,
} = await useWorkspaceActivities();

const { openTimeline } = useActivityTimeline();
const selected = ref<WorkspaceActivity | null>(null);

const openEventTimeline = (
  kind: "project" | "task",
  id: string,
  name: string,
) => {
  selected.value = null;
  openTimeline({ kind, id, name });
};
</script>

<template>
  <div class="h-full min-w-0 overflow-y-auto">
    <div class="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h1 class="text-xl font-semibold tracking-tight text-foreground">
          Activity
        </h1>
        <p class="mt-1 text-sm text-muted-foreground">
          A full audit of board changes, comments, and emails. Open a card or
          project name to see its timeline.
        </p>
      </div>
      <ActivityFilters
        :filters="filters"
        :projects="projects"
        :tasks="tasks"
        @project="setProject"
        @task="setTask"
        @kind="setKind"
      />
    </div>

    <ActivityStats
      :summary="summary"
      :loading="loading && !activities.length"
    />

    <ActivityFeed
      class="mt-5"
      :activities="activities"
      :loading="loading"
      :error="error"
      :page="page"
      :total="total"
      :page-size="pageSize"
      :range-label="rangeLabel"
      @select="selected = $event"
      @timeline="openEventTimeline"
      @retry="refresh"
      @update:page="page = $event"
    />

    <ActivityDetailModal :activity="selected" @close="selected = null" />
  </div>
</template>
