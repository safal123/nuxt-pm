<script setup lang="ts">
import { FolderKanbanIcon, PlusIcon } from "lucide-vue-next";
import type { Project } from "@/types";
import { Button } from "@/components/ui/button";

definePageMeta({
  layout: "dashboard",
  name: "workspace-projects",
  middleware: "workspace",
});

const route = useRoute();
const workspaceStore = useWorkspaceStore();
const modalsStore = useModalsStore();
const workspaceId = computed(() => String(route.params.workspaceId || ""));

const liveProjects = computed(
  () =>
    (workspaceStore.activeWorkspace?.projects ?? []).filter(
      (project: Project) => !project.archivedAt,
    ),
);

const openCreateProject = () =>
  modalsStore.openModal("createProject", {
    workspaceId: workspaceId.value,
  });
</script>

<template>
  <div class="h-full min-w-0 overflow-y-auto">
    <div class="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-lg font-semibold tracking-tight text-foreground">
          Projects
        </h1>
        <p class="mt-1 text-sm text-muted-foreground">
          Boards in this workspace. Open one to work on cards.
        </p>
      </div>
      <Button size="sm" @click="openCreateProject">
        <PlusIcon class="h-4 w-4" />
        Create project
      </Button>
    </div>

    <div
      v-if="liveProjects.length"
      class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
    >
      <NuxtLink
        v-for="project in liveProjects"
        :key="project.id"
        :to="{
          name: 'workspace-project',
          params: { workspaceId, projectId: project.id },
        }"
        class="rounded-xl border border-border bg-card p-4 transition hover:border-muted-foreground/40 hover:shadow-sm"
      >
        <div class="flex items-start gap-3">
          <div
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted"
          >
            <FolderKanbanIcon class="h-4 w-4 text-foreground" />
          </div>
          <div class="min-w-0">
            <p class="truncate font-medium text-foreground">{{ project.name }}</p>
            <p class="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
              {{ project.description || "Open the board" }}
            </p>
          </div>
        </div>
      </NuxtLink>
    </div>
    <div
      v-else
      class="rounded-xl border border-dashed border-border px-6 py-16 text-center text-sm text-muted-foreground"
    >
      No projects in this workspace yet.
    </div>
  </div>
</template>
