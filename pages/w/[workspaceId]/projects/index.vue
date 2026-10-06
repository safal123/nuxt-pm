<script setup lang="ts">
import {
  CalendarDaysIcon,
  Columns3Icon,
  FolderKanbanIcon,
  PlusIcon,
  SearchIcon,
  SettingsIcon,
  Table2Icon,
} from "lucide-vue-next";
import type { Project, ProjectView } from "@/types";
import { relativeDate } from "@/utils/date";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

definePageMeta({
  layout: "dashboard",
  name: "workspace-projects",
  middleware: "workspace",
});

const VIEW_META: Record<
  ProjectView,
  { label: string; icon: typeof Columns3Icon }
> = {
  board: { label: "Board", icon: Columns3Icon },
  table: { label: "Table", icon: Table2Icon },
  calendar: { label: "Calendar", icon: CalendarDaysIcon },
};

const route = useRoute();
const workspaceStore = useWorkspaceStore();
const modalsStore = useModalsStore();
const workspaceId = computed(() => String(route.params.workspaceId || ""));
const query = ref("");

const liveProjects = computed(() =>
  (workspaceStore.activeWorkspace?.projects ?? [])
    .filter((project: Project) => !project.archivedAt)
    .slice()
    .sort((a, b) => {
      const left = new Date(b.updatedAt).getTime();
      const right = new Date(a.updatedAt).getTime();
      return left - right;
    }),
);

const filteredProjects = computed(() => {
  const needle = query.value.trim().toLowerCase();
  if (!needle) return liveProjects.value;
  return liveProjects.value.filter((project) => {
    const name = project.name.toLowerCase();
    const description = (project.description || "").toLowerCase();
    return name.includes(needle) || description.includes(needle);
  });
});

const viewCount = (view: ProjectView) =>
  liveProjects.value.filter(
    (project) => (project.settings?.defaultView ?? "board") === view,
  ).length;

const statItems = computed(() => [
  { label: "Projects", value: liveProjects.value.length, icon: FolderKanbanIcon },
  { label: "Board", value: viewCount("board"), icon: Columns3Icon },
  { label: "Table", value: viewCount("table"), icon: Table2Icon },
  { label: "Calendar", value: viewCount("calendar"), icon: CalendarDaysIcon },
]);

const viewMeta = (project: Project) =>
  VIEW_META[project.settings?.defaultView ?? "board"];

const openCreateProject = () =>
  modalsStore.openModal("createProject", {
    workspaceId: workspaceId.value,
  });
</script>

<template>
  <div class="h-full min-w-0 overflow-y-auto">
    <PageHeader
      title="Projects"
      description="Boards in this workspace. Open one to work on cards."
    >
      <Button @click="openCreateProject">
        <PlusIcon />
        Create project
      </Button>
    </PageHeader>

    <PageStats :items="statItems" />

    <div class="mt-4 overflow-hidden rounded-xl border border-border bg-card">
      <div
        v-if="liveProjects.length"
        class="flex items-center gap-2 border-b border-border px-3 py-2"
      >
        <div class="relative min-w-0 flex-1">
          <SearchIcon
            class="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            v-model="query"
            type="search"
            placeholder="Search projects…"
            class="pl-8"
          />
        </div>
        <p class="shrink-0 text-[11px] text-muted-foreground">
          {{ filteredProjects.length }}
          {{ filteredProjects.length === 1 ? "project" : "projects" }}
        </p>
      </div>

      <div
        v-if="!liveProjects.length"
        class="flex flex-col items-center px-3 py-12 text-center"
      >
        <div
          class="flex size-8 items-center justify-center rounded-full bg-muted text-muted-foreground"
        >
          <FolderKanbanIcon class="size-4" />
        </div>
        <p class="mt-2.5 text-[13px] font-medium text-foreground">
          No projects yet
        </p>
        <p class="mt-1 max-w-sm text-[12px] text-muted-foreground">
          Create a project to start a board, table, or calendar.
        </p>
        <Button class="mt-3" @click="openCreateProject">
          <PlusIcon />
          Create project
        </Button>
      </div>

      <div
        v-else-if="!filteredProjects.length"
        class="px-3 py-10 text-center text-[12px] text-muted-foreground"
      >
        No projects match “{{ query }}”.
      </div>

      <div v-else class="divide-y divide-border">
        <div
          v-for="project in filteredProjects"
          :key="project.id"
          class="flex items-center gap-2.5 px-3 py-2.5 hover:bg-accent/50"
        >
          <NuxtLink
            :to="{
              name: 'workspace-project',
              params: { workspaceId, projectId: project.id },
            }"
            class="flex min-w-0 flex-1 items-start gap-2.5"
          >
            <div
              class="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-muted"
            >
              <FolderKanbanIcon class="size-3.5 text-foreground" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate text-[13px] font-medium text-foreground">
                {{ project.name }}
              </p>
              <p class="mt-0.5 line-clamp-1 text-[12px] text-muted-foreground">
                {{ project.description || "Open the board" }}
              </p>
            </div>
          </NuxtLink>

          <span
            class="hidden items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground sm:inline-flex"
          >
            <component :is="viewMeta(project).icon" class="size-3" />
            {{ viewMeta(project).label }}
          </span>
          <span
            class="hidden w-24 shrink-0 text-right text-[11px] text-muted-foreground md:block"
            :title="String(project.updatedAt)"
          >
            {{ relativeDate(project.updatedAt) }}
          </span>
          <Button
            variant="ghost"
            size="icon"
            class="text-muted-foreground"
            as-child
          >
            <NuxtLink
              :to="{
                name: 'workspace-project-settings',
                params: { workspaceId, projectId: project.id },
              }"
              aria-label="Project settings"
              @click.stop
            >
              <SettingsIcon />
            </NuxtLink>
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>
