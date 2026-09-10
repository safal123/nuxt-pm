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
  loading,
  error,
  rangeLabel,
  setProject,
  setTask,
  setKind,
  refresh,
} = await useWorkspaceActivities();

const selected = ref<WorkspaceActivity | null>(null);
</script>

<template>
  <div class="h-full min-w-0">
    <div class="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h1 class="text-lg font-semibold tracking-tight text-foreground">Activities</h1>
        <p class="mt-1 text-sm text-muted-foreground">
          Board changes for the workspace, plus emails you sent.
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

    <ActivityTable
      :activities="activities"
      :loading="loading"
      :error="error"
      :page="page"
      :total="total"
      :page-size="pageSize"
      :range-label="rangeLabel"
      @select="selected = $event"
      @retry="refresh"
      @update:page="page = $event"
    />

    <ActivityDetailModal :activity="selected" @close="selected = null" />
  </div>
</template>
