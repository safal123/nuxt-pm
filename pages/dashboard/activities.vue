<script setup lang="ts">
import { format, formatDistanceToNow, parseISO } from "date-fns";
import type { TaskAssignee, TaskActivityType, WorkspaceActivity } from "@/types";
import { Button } from "@/components/ui/button";
import { activityTypeChip, whenChip } from "@/utils/table-chips";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationEllipsis,
  PaginationFirst,
  PaginationLast,
  PaginationList,
  PaginationListItem,
  PaginationNext,
  PaginationPrev,
} from "@/components/ui/pagination";

definePageMeta({
  layout: "dashboard",
});

const PAGE_SIZE = 12;
const ALL = "all";

const workspaceStore = useWorkspaceStore();
const loading = ref(true);
const activities = ref<WorkspaceActivity[]>([]);
const projects = ref<{ id: string; name: string }[]>([]);
const tasks = ref<{ id: string; title: string; projectId: string }[]>([]);
const projectId = ref(ALL);
const taskId = ref(ALL);
const kind = ref("all");
const page = ref(1);

const { showEmailsInActivity } = useAppSettings();

const fetchActivities = async () => {
  const workspaceId = workspaceStore.activeWorkspaceId;
  if (!workspaceId) {
    loading.value = false;
    return;
  }
  loading.value = true;
  try {
    const headers = import.meta.server
      ? useRequestHeaders(["cookie"])
      : undefined;
    const result = await $fetch<{
      data: {
        activities: WorkspaceActivity[]
        projects: { id: string; name: string }[]
        tasks: { id: string; title: string; projectId: string }[]
      }
    }>(`/api/workspaces/${workspaceId}/activities`, {
      headers,
      query: {
        projectId: projectId.value,
        taskId: taskId.value,
        kind:
          kind.value === "all" && !showEmailsInActivity.value
            ? "task"
            : kind.value,
      },
    });
    activities.value = result?.data?.activities ?? [];
    projects.value = result?.data?.projects ?? [];
    tasks.value = result?.data?.tasks ?? [];
  } catch (error) {
    console.error(error);
    activities.value = [];
  } finally {
    loading.value = false;
  }
};

await fetchActivities();

watch(
  () => workspaceStore.activeWorkspaceId,
  () => {
    projectId.value = ALL;
    taskId.value = ALL;
    kind.value = ALL;
  },
);

watch([projectId, taskId, kind, () => workspaceStore.activeWorkspaceId], () => {
  page.value = 1;
  fetchActivities();
});

const paged = computed(() => {
  const start = (page.value - 1) * PAGE_SIZE;
  return activities.value.slice(start, start + PAGE_SIZE);
});

watch(activities, (list) => {
  const lastPage = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  if (page.value > lastPage) page.value = lastPage;
});

const rangeLabel = computed(() => {
  if (!activities.value.length) return "0 events";
  const start = (page.value - 1) * PAGE_SIZE + 1;
  const end = Math.min(page.value * PAGE_SIZE, activities.value.length);
  return `${start}–${end} of ${activities.value.length}`;
});

const when = (value: Date | string) => {
  const date = typeof value === "string" ? parseISO(value) : new Date(value);
  if (Number.isNaN(date.getTime())) return { label: "—", title: "" };
  return {
    label: formatDistanceToNow(date, { addSuffix: true }),
    title: format(date, "MMM d, yyyy 'at' h:mm a"),
  };
};

const initials = (person: TaskAssignee) => {
  const name = person.name || person.email || "";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase() || "?";
};

const typeLabel = (type: TaskActivityType | string) =>
  String(type).replace(/_/g, " ").toLowerCase();

const onProject = (value: unknown) => {
  if (typeof value !== "string") return;
  projectId.value = value;
  taskId.value = ALL;
};

const onTask = (value: unknown) => {
  if (typeof value !== "string") return;
  taskId.value = value;
  if (value !== ALL) kind.value = "task";
};

const onKind = (value: unknown) => {
  if (typeof value !== "string") return;
  kind.value = value;
  if (value === "email") taskId.value = ALL;
};

const selected = ref<WorkspaceActivity | null>(null);

const openActivity = (item: WorkspaceActivity) => {
  selected.value = item;
};
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
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Select :model-value="kind" @update:model-value="onKind">
          <SelectTrigger class="h-9 w-full sm:w-[160px]">
            <SelectValue placeholder="All activity" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem :value="ALL">All activity</SelectItem>
              <SelectItem value="task">Cards</SelectItem>
              <SelectItem value="email">Emails</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        <Select :model-value="projectId" @update:model-value="onProject">
          <SelectTrigger class="h-9 w-full sm:w-[200px]">
            <SelectValue placeholder="All projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem :value="ALL">All projects</SelectItem>
              <SelectItem
                v-for="project in projects"
                :key="project.id"
                :value="project.id"
              >
                {{ project.name }}
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        <Select
          :model-value="taskId"
          :disabled="kind === 'email'"
          @update:model-value="onTask"
        >
          <SelectTrigger class="h-9 w-full sm:w-[220px]">
            <SelectValue placeholder="All tasks" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem :value="ALL">All tasks</SelectItem>
              <SelectItem
                v-for="task in tasks"
                :key="task.id"
                :value="task.id"
              >
                {{ task.title }}
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </div>

    <div class="overflow-hidden rounded-xl border border-border bg-card">
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
          <TableEmpty v-if="loading && !activities.length" :colspan="5">
            <span class="text-muted-foreground">Loading activity…</span>
          </TableEmpty>
          <TableEmpty v-else-if="!activities.length" :colspan="5">
            <span class="text-muted-foreground">No activity matches these filters.</span>
          </TableEmpty>
          <TableRow
            v-for="item in paged"
            :key="item.id"
            class="cursor-pointer"
            @click="openActivity(item)"
          >
            <TableCell class="py-3">
              <div class="flex items-start gap-3 min-w-0">
                <div
                  class="mt-0.5 h-8 w-8 shrink-0 overflow-hidden rounded-full bg-violet-100 text-[11px] font-semibold text-violet-700 dark:bg-violet-500/20 dark:text-violet-300 flex items-center justify-center"
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
                  }}</span>{{ " " }}<span class="text-muted-foreground">{{
                    item.message
                  }}</span>
                </p>
              </div>
            </TableCell>
            <TableCell class="max-w-[220px] truncate text-sm text-foreground">
              {{ item.email?.subject || item.task?.title || "—" }}
            </TableCell>
            <TableCell class="max-w-[180px] truncate text-sm text-muted-foreground">
              {{ item.project?.name || "Workspace" }}
            </TableCell>
            <TableCell>
              <span :class="activityTypeChip(item.type)">
                {{ typeLabel(item.type) }}
              </span>
            </TableCell>
            <TableCell class="whitespace-nowrap" :title="when(item.createdAt).title">
              <span :class="whenChip(item.createdAt)">
                {{ when(item.createdAt).label }}
              </span>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <div
        v-if="activities.length"
        class="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <p class="text-sm text-muted-foreground">{{ rangeLabel }}</p>
        <Pagination
          v-if="activities.length > PAGE_SIZE"
          v-slot="{ page: currentPage }"
          :page="page"
          :total="activities.length"
          :items-per-page="PAGE_SIZE"
          :sibling-count="1"
          show-edges
          @update:page="page = $event"
        >
          <PaginationList v-slot="{ items }" class="flex items-center gap-1">
            <PaginationFirst />
            <PaginationPrev />
            <template v-for="(item, index) in items" :key="index">
              <PaginationListItem
                v-if="item.type === 'page'"
                :value="item.value"
                as-child
              >
                <Button
                  class="h-8 w-8 p-0"
                  :variant="item.value === currentPage ? 'default' : 'outline'"
                >
                  {{ item.value }}
                </Button>
              </PaginationListItem>
              <PaginationEllipsis v-else :index="index" />
            </template>
            <PaginationNext />
            <PaginationLast />
          </PaginationList>
        </Pagination>
      </div>
    </div>

    <ActivityDetailModal :activity="selected" @close="selected = null" />
  </div>
</template>
