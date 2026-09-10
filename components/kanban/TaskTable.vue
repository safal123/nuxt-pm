<script setup lang="ts">
import { format, formatDistanceToNow, isPast, isToday, isTomorrow, parseISO } from "date-fns";
import { CalendarIcon, MessageSquareIcon } from "lucide-vue-next";
import type { Task, TaskAssignee } from "@/types";
import { api } from "~/lib/api";
import { priorityChip, priorityLabel } from "@/utils/task-priority";
import { statusChip, statusLabel } from "@/utils/task-status";
import { Button } from "@/components/ui/button";
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

const PAGE_SIZE = 10;

const boardStore = useBoardStore();
const page = ref(1);
const total = ref(0);
const tasks = ref<Task[]>([]);
const loading = ref(false);

const parseDate = (value: Date | string | null | undefined) => {
  if (!value) return null;
  const date = typeof value === "string" ? parseISO(value) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const dueFor = (task: Task) => {
  const date = parseDate(task.dueDate);
  if (!date) return null;
  let label = format(date, "MMM d");
  if (isToday(date)) label = "Today";
  else if (isTomorrow(date)) label = "Tomorrow";
  const overdue = isPast(date) && !isToday(date);
  const soon = isToday(date) || isTomorrow(date);
  return {
    label,
    className: overdue
      ? "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
      : soon
        ? "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
        : "bg-muted text-muted-foreground",
  };
};

const rows = computed(() =>
  tasks.value.map((task) => ({
    ...task,
    due: dueFor(task),
  })),
);

const rangeLabel = computed(() => {
  if (!total.value) return "0 tasks";
  const start = (page.value - 1) * PAGE_SIZE + 1;
  const end = Math.min(page.value * PAGE_SIZE, total.value);
  return `${start}–${end} of ${total.value}`;
});

const fetchTasks = async (options?: { silent?: boolean }) => {
  const projectId = boardStore.projectId;
  if (!projectId) {
    tasks.value = [];
    total.value = 0;
    return;
  }
  if (!options?.silent) loading.value = true;
  try {
    const result = await api<{ tasks: Task[]; total: number }>(
      `/api/projects/${projectId}/tasks`,
      { query: { page: page.value, limit: PAGE_SIZE } },
    );
    tasks.value = result.tasks ?? [];
    total.value = result.total ?? 0;
    const maxPage = Math.max(1, Math.ceil(total.value / PAGE_SIZE) || 1);
    if (page.value > maxPage) {
      page.value = maxPage;
      await fetchTasks({ silent: true });
    }
  } catch (error) {
    console.error("Failed to load tasks:", error);
    tasks.value = [];
    total.value = 0;
  } finally {
    if (!options?.silent) loading.value = false;
  }
};

watch(
  () => boardStore.projectId,
  () => {
    page.value = 1;
    fetchTasks();
  },
  { immediate: true },
);

watch(
  () => boardStore.listVersion,
  () => {
    if (!boardStore.projectId) return;
    fetchTasks({ silent: true });
  },
);

const onPage = (next: number) => {
  if (next === page.value) return;
  page.value = next;
  fetchTasks();
};

const createdLabel = (task: Task) => {
  const date = parseDate(task.createdAt);
  if (!date) return "—";
  return formatDistanceToNow(date, { addSuffix: true });
};

const personName = (person: TaskAssignee | null) =>
  person?.name || person?.email || "";

const initials = (person: TaskAssignee | null) => {
  const name = personName(person);
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase() || "?";
};
</script>

<template>
  <div class="rounded-xl border border-border bg-card overflow-hidden">
    <Table>
      <TableHeader class="bg-muted/70">
        <TableRow class="hover:bg-transparent">
          <TableHead class="min-w-[220px]">Task</TableHead>
          <TableHead class="w-[130px]">Status</TableHead>
          <TableHead class="w-[110px]">Priority</TableHead>
          <TableHead class="w-[140px]">List</TableHead>
          <TableHead class="w-[160px]">Assignee</TableHead>
          <TableHead class="w-[120px]">Due</TableHead>
          <TableHead class="w-[140px]">Created</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableEmpty v-if="loading" :colspan="7">
          <span class="text-muted-foreground">Loading tasks…</span>
        </TableEmpty>
        <TableEmpty v-else-if="!rows.length" :colspan="7">
          <span class="text-muted-foreground">No tasks in this project yet.</span>
        </TableEmpty>
        <template v-else>
        <TableRow
          v-for="task in rows"
          :key="task.id"
          class="cursor-pointer"
          @click="boardStore.openTask(task)"
        >
          <TableCell class="align-top">
            <div class="min-w-0">
              <p
                class="font-medium text-foreground leading-snug"
                :class="task.status === 'DONE' ? 'line-through text-muted-foreground' : ''"
              >
                {{ task.title }}
              </p>
              <div
                v-if="task.labels?.length || task.commentCount"
                class="mt-1.5 flex flex-wrap items-center gap-1.5"
              >
                <span
                  v-for="label in task.labels.slice(0, 3)"
                  :key="label.id"
                  class="h-5 max-w-[5.5rem] truncate rounded px-1.5 text-[10px] font-semibold text-white leading-5"
                  :style="{ backgroundColor: label.color }"
                  :title="label.name"
                >
                  {{ label.name }}
                </span>
                <span
                  v-if="task.labels.length > 3"
                  class="text-[10px] text-muted-foreground"
                >
                  +{{ task.labels.length - 3 }}
                </span>
                <span
                  v-if="task.commentCount"
                  class="inline-flex items-center gap-1 text-[11px] text-muted-foreground"
                >
                  <MessageSquareIcon class="h-3 w-3" />
                  {{ task.commentCount }}
                </span>
              </div>
            </div>
          </TableCell>
          <TableCell>
            <span
              class="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold tracking-wide ring-1 ring-inset"
              :class="statusChip(task.status || 'TODO')"
            >
              {{ statusLabel(task.status || "TODO") }}
            </span>
          </TableCell>
          <TableCell>
            <span
              class="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold tracking-wide ring-1 ring-inset"
              :class="priorityChip(task.priority)"
            >
              {{ priorityLabel(task.priority) }}
            </span>
          </TableCell>
          <TableCell class="text-muted-foreground">
            {{ task.columnName || "—" }}
          </TableCell>
          <TableCell>
            <div
              v-if="task.assignee"
              class="flex items-center gap-2 min-w-0"
            >
              <div
                class="h-6 w-6 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300 text-[10px] font-semibold overflow-hidden shrink-0 flex items-center justify-center"
              >
                <img
                  v-if="task.assignee.imageUrl"
                  :src="task.assignee.imageUrl"
                  :alt="personName(task.assignee)"
                  class="h-full w-full object-cover"
                />
                <span v-else>{{ initials(task.assignee) }}</span>
              </div>
              <span class="truncate text-sm">{{ personName(task.assignee) }}</span>
            </div>
            <span v-else class="text-muted-foreground">Unassigned</span>
          </TableCell>
          <TableCell>
            <span
              v-if="task.due"
              class="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium"
              :class="task.due.className"
            >
              <CalendarIcon class="h-3 w-3" />
              {{ task.due.label }}
            </span>
            <span v-else class="text-muted-foreground">—</span>
          </TableCell>
          <TableCell class="text-muted-foreground whitespace-nowrap">
            {{ createdLabel(task) }}
          </TableCell>
        </TableRow>
        </template>
      </TableBody>
    </Table>

    <div
      v-if="total"
      class="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <p class="text-sm text-muted-foreground">
        {{ rangeLabel }}
      </p>
      <Pagination
        v-if="total > PAGE_SIZE"
        v-slot="{ page: currentPage }"
        :page="page"
        :total="total"
        :items-per-page="PAGE_SIZE"
        :sibling-count="1"
        show-edges
        @update:page="onPage"
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
                class="h-10 w-10 p-0"
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
</template>
