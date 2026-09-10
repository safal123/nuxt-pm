<script setup lang="ts">
import {
  ArrowRightIcon,
  CheckCircle2Icon,
  CircleDashedIcon,
  FolderKanbanIcon,
  PlusIcon,
  UsersIcon,
} from "lucide-vue-next";
import type { Project, TaskAssignee, WorkspaceActivity } from "@/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, relativeDate, whenDate } from "@/utils/date";
import { activityTypeChip, whenChip } from "@/utils/table-chips";

definePageMeta({
  layout: "dashboard",
  name: "workspace-dashboard",
  middleware: "workspace",
});

const route = useRoute();
const workspaceStore = useWorkspaceStore();
const userStore = useUserStore();
const modalsStore = useModalsStore();
const workspaceId = computed(() => String(route.params.workspaceId || ""));

const { stats, activity, pending } = useWorkspaceSummary(workspaceId);
const selectedActivity = ref<WorkspaceActivity | null>(null);

const workspace = computed(() => workspaceStore.activeWorkspace);
const liveProjects = computed(() =>
  [...(workspace.value?.projects ?? [])]
    .filter((project: Project) => !project.archivedAt)
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    ),
);
const shownProjects = computed(() => liveProjects.value.slice(0, 8));

const firstName = computed(() => {
  const name = userStore.user?.name?.trim();
  if (!name) return null;
  return name.split(/\s+/)[0];
});

const greeting = computed(() => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
});

const createdLabel = computed(() => {
  const value = workspace.value?.createdAt;
  return value ? formatDate(value) : null;
});

const openCreateProject = () =>
  modalsStore.openModal("createProject", {
    workspaceId: workspaceId.value,
  });

const typeLabel = (type: string) => type.replace(/_/g, " ").toLowerCase();

const initials = (person: TaskAssignee) => {
  const name = person.name || person.email || "";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase() || "?";
};

const openActivity = (item: (typeof activity.value)[number]) => {
  selectedActivity.value = {
    ...item,
    metadata: null,
    email: null,
  } as WorkspaceActivity;
};
</script>

<template>
  <div class="h-full min-w-0 overflow-y-auto">
    <div class="flex w-full flex-col gap-8 pb-10">
      <div class="min-w-0">
        <p class="text-sm text-muted-foreground">
          {{ greeting }}{{ firstName ? `, ${firstName}` : "" }}
        </p>
        <h1
          class="mt-1 truncate text-2xl font-semibold tracking-tight text-foreground"
        >
          {{ workspace?.name || "Workspace" }}
        </h1>
        <p class="mt-1 text-sm text-muted-foreground">
          <template v-if="createdLabel">Created {{ createdLabel }}</template>
          <template v-if="createdLabel && workspaceStore.members.length">
            ·
          </template>
          {{ workspaceStore.members.length }}
          {{ workspaceStore.members.length === 1 ? "member" : "members" }}
        </p>
      </div>

      <div
        class="grid overflow-hidden rounded-xl border border-border bg-card sm:grid-cols-2 xl:grid-cols-4"
      >
        <template v-if="pending">
          <div
            v-for="index in 4"
            :key="index"
            class="border-border px-5 py-4"
            :class="{
              'border-t sm:border-t-0': index > 1,
              'sm:border-r': index === 1 || index === 3,
              'xl:border-r': index < 4,
              'xl:border-t-0': index > 2,
            }"
          >
            <Skeleton class="h-4 w-20" />
            <Skeleton class="mt-3 h-8 w-16" />
            <Skeleton class="mt-2 h-3 w-28" />
          </div>
        </template>
        <template v-else>
          <div class="px-5 py-4 sm:border-r sm:border-border">
            <div class="flex items-center justify-between gap-3">
              <p class="text-sm text-muted-foreground">Projects</p>
              <FolderKanbanIcon class="h-4 w-4 text-muted-foreground" />
            </div>
            <p class="mt-3 text-2xl font-semibold tabular-nums text-foreground">
              {{ stats.liveProjects }}
            </p>
            <p class="mt-1 text-xs text-muted-foreground">
              {{ stats.archivedProjects }} archived
            </p>
          </div>
          <div
            class="border-t border-border px-5 py-4 sm:border-t-0 xl:border-r"
          >
            <div class="flex items-center justify-between gap-3">
              <p class="text-sm text-muted-foreground">Open cards</p>
              <CircleDashedIcon class="h-4 w-4 text-muted-foreground" />
            </div>
            <p class="mt-3 text-2xl font-semibold tabular-nums text-foreground">
              {{ stats.openTasks }}
            </p>
            <p class="mt-1 text-xs text-muted-foreground">
              Not marked complete
            </p>
          </div>
          <div
            class="border-t border-border px-5 py-4 sm:border-r xl:border-t-0"
          >
            <div class="flex items-center justify-between gap-3">
              <p class="text-sm text-muted-foreground">Completed</p>
              <CheckCircle2Icon class="h-4 w-4 text-muted-foreground" />
            </div>
            <p class="mt-3 text-2xl font-semibold tabular-nums text-foreground">
              {{ stats.doneTasks }}
            </p>
            <p class="mt-1 text-xs text-muted-foreground">
              Across live projects
            </p>
          </div>
          <div class="border-t border-border px-5 py-4 xl:border-t-0">
            <div class="flex items-center justify-between gap-3">
              <p class="text-sm text-muted-foreground">Members</p>
              <UsersIcon class="h-4 w-4 text-muted-foreground" />
            </div>
            <p class="mt-3 text-2xl font-semibold tabular-nums text-foreground">
              {{ workspaceStore.members.length }}
            </p>
            <p class="mt-1 text-xs text-muted-foreground">In this workspace</p>
          </div>
        </template>
      </div>

      <section class="min-w-0 space-y-4">
        <div class="flex items-end justify-between gap-3">
          <div>
            <h2 class="text-base font-semibold text-foreground">Projects</h2>
            <p class="mt-0.5 text-sm text-muted-foreground">
              Recently updated boards.
            </p>
          </div>
          <Button v-if="liveProjects.length" variant="ghost" size="sm" as-child>
            <NuxtLink
              :to="{ name: 'workspace-projects', params: { workspaceId } }"
              class="gap-1"
            >
              View all
              <ArrowRightIcon class="h-3.5 w-3.5" />
            </NuxtLink>
          </Button>
        </div>

        <div
          v-if="shownProjects.length"
          class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          <NuxtLink
            v-for="project in shownProjects"
            :key="project.id"
            :to="{
              name: 'workspace-project',
              params: { workspaceId, projectId: project.id },
            }"
            class="group flex min-h-[148px] flex-col rounded-xl border border-border bg-card p-4 transition hover:border-muted-foreground/30 hover:bg-accent/30"
          >
            <div
              class="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-foreground"
            >
              <FolderKanbanIcon class="h-4 w-4" />
            </div>
            <p class="mt-3 truncate font-medium text-foreground">
              {{ project.name }}
            </p>
            <p
              class="mt-1 line-clamp-2 flex-1 text-sm leading-5 text-muted-foreground"
            >
              {{ project.description || "No description yet." }}
            </p>
            <p class="mt-3 text-xs text-muted-foreground">
              Updated {{ relativeDate(project.updatedAt) }}
            </p>
          </NuxtLink>
        </div>
        <div
          v-else
          class="flex flex-col items-start gap-4 rounded-xl border border-dashed border-border bg-card/50 px-6 py-12"
        >
          <div
            class="flex h-10 w-10 items-center justify-center rounded-lg bg-muted"
          >
            <FolderKanbanIcon class="h-4 w-4 text-muted-foreground" />
          </div>
          <div class="space-y-1">
            <p class="text-sm font-medium text-foreground">No projects yet</p>
            <p class="max-w-md text-sm text-muted-foreground">
              Create a project to start lists, cards, and the board for this
              workspace.
            </p>
          </div>
          <Button size="sm" @click="openCreateProject">
            <PlusIcon class="h-4 w-4" />
            Create project
          </Button>
        </div>
      </section>

      <section class="min-w-0 space-y-4">
        <div class="flex items-end justify-between gap-3">
          <div>
            <h2 class="text-base font-semibold text-foreground">Activity</h2>
            <p class="mt-0.5 text-sm text-muted-foreground">
              Latest changes in this workspace.
            </p>
          </div>
          <Button variant="ghost" size="sm" as-child>
            <NuxtLink
              :to="{ name: 'workspace-activities', params: { workspaceId } }"
              class="gap-1"
            >
              View all
              <ArrowRightIcon class="h-3.5 w-3.5" />
            </NuxtLink>
          </Button>
        </div>

        <div class="space-y-2 md:hidden">
          <div
            v-if="pending && !activity.length"
            class="rounded-xl border border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground"
          >
            Loading activity…
          </div>
          <div
            v-else-if="!activity.length"
            class="rounded-xl border border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground"
          >
            Changes will show up here.
          </div>
          <button
            v-for="item in activity"
            :key="item.id"
            type="button"
            class="w-full rounded-xl border border-border bg-card p-4 text-left"
            @click="openActivity(item)"
          >
            <div class="flex items-start gap-3">
              <div
                class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-violet-100 text-[11px] font-semibold text-violet-700 dark:bg-violet-500/20 dark:text-violet-300"
              >
                <img
                  v-if="item.user.imageUrl"
                  :src="item.user.imageUrl"
                  class="h-full w-full object-cover"
                />
                <span v-else>{{ initials(item.user) }}</span>
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-sm leading-5">
                  <span class="font-semibold text-foreground">{{
                    item.user.name || item.user.email
                  }}</span
                  >{{ " "
                  }}<span class="text-muted-foreground">{{
                    item.message
                  }}</span>
                </p>
                <p class="mt-1 truncate text-sm text-foreground">
                  {{ item.task?.title || "—" }}
                </p>
                <p class="mt-0.5 truncate text-xs text-muted-foreground">
                  {{ item.project?.name || "Workspace" }}
                </p>
                <div class="mt-2 flex flex-wrap items-center gap-2">
                  <span :class="activityTypeChip(item.type)">
                    {{ typeLabel(item.type) }}
                  </span>
                  <span :class="whenChip(item.createdAt)">
                    {{ whenDate(item.createdAt).label }}
                  </span>
                </div>
              </div>
            </div>
          </button>
        </div>

        <div
          class="hidden overflow-hidden rounded-xl border border-border bg-card md:block"
        >
          <Table>
            <TableHeader>
              <TableRow class="hover:bg-transparent border-border">
                <TableHead class="h-10 min-w-[280px]">Activity</TableHead>
                <TableHead class="h-10">On</TableHead>
                <TableHead class="h-10">Project</TableHead>
                <TableHead class="h-10 w-[140px]">Type</TableHead>
                <TableHead class="h-10 w-[140px]">When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableEmpty v-if="pending && !activity.length" :colspan="5">
                <span class="text-muted-foreground">Loading activity…</span>
              </TableEmpty>
              <TableEmpty v-else-if="!activity.length" :colspan="5">
                <span class="text-muted-foreground">
                  Changes will show up here.
                </span>
              </TableEmpty>
              <TableRow
                v-for="item in activity"
                :key="item.id"
                class="cursor-pointer"
                @click="openActivity(item)"
              >
                <TableCell class="py-3">
                  <div class="flex min-w-0 items-start gap-3">
                    <div
                      class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-violet-100 text-[11px] font-semibold text-violet-700 dark:bg-violet-500/20 dark:text-violet-300"
                    >
                      <img
                        v-if="item.user.imageUrl"
                        :src="item.user.imageUrl"
                        class="h-full w-full object-cover"
                      />
                      <span v-else>{{ initials(item.user) }}</span>
                    </div>
                    <p class="min-w-0 text-sm leading-5">
                      <span class="font-semibold text-foreground">{{
                        item.user.name || item.user.email
                      }}</span
                      >{{ " "
                      }}<span class="text-muted-foreground">{{
                        item.message
                      }}</span>
                    </p>
                  </div>
                </TableCell>
                <TableCell
                  class="max-w-[220px] truncate text-sm text-foreground"
                >
                  {{ item.task?.title || "—" }}
                </TableCell>
                <TableCell
                  class="max-w-[180px] truncate text-sm text-muted-foreground"
                >
                  {{ item.project?.name || "Workspace" }}
                </TableCell>
                <TableCell>
                  <span :class="activityTypeChip(item.type)">
                    {{ typeLabel(item.type) }}
                  </span>
                </TableCell>
                <TableCell
                  class="whitespace-nowrap"
                  :title="whenDate(item.createdAt).title"
                >
                  <span :class="whenChip(item.createdAt)">
                    {{ whenDate(item.createdAt).label }}
                  </span>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </section>
    </div>

    <ActivityDetailModal
      :activity="selectedActivity"
      @close="selectedActivity = null"
    />
  </div>
</template>
