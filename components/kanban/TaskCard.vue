<script setup lang="ts">
import {
  CalendarIcon,
  MessageSquareIcon,
  PaperclipIcon,
  HeartIcon,
  Trash2Icon,
  GripVerticalIcon,
} from "lucide-vue-next";
import { format, isPast, isToday, isTomorrow, parseISO } from "date-fns";
import type { Task, TaskPriority } from "@/types";
import { priorityChip } from "@/utils/task-priority";
import { statusChip, statusLabel } from "@/utils/task-status";

const CARD_HEIGHT = 148;

const props = withDefaults(
  defineProps<{
    task: Task;
    preview?: boolean;
  }>(),
  { preview: false },
);

const emit = defineEmits<{
  (e: "delete", taskId: string): void;
  (e: "like", taskId: string): void;
  (e: "pointerdown", event: PointerEvent): void;
}>();

const boardStore = useBoardStore();
const isPlaceholder = computed(
  () => !props.preview && boardStore.draggingTask?.id === props.task.id,
);

const priorityBar: Record<TaskPriority, string> = {
  LOW: "bg-slate-300",
  MEDIUM: "bg-sky-400",
  HIGH: "bg-amber-400",
  URGENT: "bg-rose-500",
};

const assigneeInitials = computed(() => {
  const name = props.task.assignee?.name || props.task.assignee?.email || "";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase() || "?";
});

const parseDate = (value: Date | string | null | undefined) => {
  if (!value) return null;
  const date = typeof value === "string" ? parseISO(value) : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const due = computed(() => {
  const date = parseDate(props.task.dueDate);
  if (!date) return null;

  let label = format(date, "MMM d");
  if (isToday(date)) label = "Today";
  else if (isTomorrow(date)) label = "Tomorrow";

  return {
    label,
    overdue: isPast(date) && !isToday(date),
    soon: isToday(date) || isTomorrow(date),
  };
});

const dateRange = computed(() => {
  const start = parseDate(props.task.startDate);
  const end = parseDate(props.task.endDate);
  if (!start && !end) return null;
  const parts = [
    start ? format(start, "MMM d") : null,
    end ? format(end, "MMM d") : null,
  ].filter(Boolean);
  return parts.join(" – ");
});

const visibleLabels = computed(() => (props.task.labels || []).slice(0, 3));
const extraLabelCount = computed(
  () => Math.max(0, (props.task.labels?.length || 0) - 3),
);

const onPointerDown = (event: PointerEvent) => {
  if (props.preview) return;
  emit("pointerdown", event);
};
</script>

<template>
  <div
    v-if="isPlaceholder"
    class="rounded-xl border-2 border-dashed border-violet-300 bg-violet-100/70 dark:border-violet-700 dark:bg-violet-950/40"
    :style="{ height: `${boardStore.dragSize.height || CARD_HEIGHT}px` }"
  />
  <div
    v-else
    class="group relative flex flex-col bg-card rounded-xl border border-border overflow-hidden"
    :class="[
      preview
        ? 'shadow-[0_18px_40px_rgba(15,23,42,0.18)] dark:shadow-[0_18px_40px_rgba(0,0,0,0.45)] ring-1 ring-black/5 dark:ring-white/10'
        : 'shadow-sm cursor-grab hover:border-muted-foreground/30 hover:shadow-md',
      task.status === 'DONE' ? 'opacity-80' : '',
    ]"
    :style="{ height: `${CARD_HEIGHT}px`, touchAction: 'none' }"
    @pointerdown="onPointerDown"
    @dragstart.prevent
  >
    <div
      v-if="task.coverColor"
      class="absolute inset-x-0 top-0 h-1.5"
      :style="{ backgroundColor: colorValue(task.coverColor) }"
    />
    <div
      v-else
      class="absolute inset-y-0 left-0 w-0.5"
      :class="priorityBar[task.priority] || priorityBar.MEDIUM"
    />

    <div class="flex-1 min-h-0 pl-3.5 pr-3 pt-3 pb-1.5 flex flex-col">
      <div class="flex items-start gap-2 min-h-0">
        <GripVerticalIcon
          v-if="!preview"
          class="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition"
        />
        <div class="min-w-0 flex-1">
          <div class="flex items-start justify-between gap-2">
            <p
              class="text-[13px] font-medium text-foreground leading-snug line-clamp-2 break-words"
              :class="task.status === 'DONE' ? 'line-through text-muted-foreground' : ''"
            >
              {{ task.title }}
            </p>
            <button
              v-if="!preview"
              type="button"
              class="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-600 transition shrink-0 -mt-0.5"
              @click.stop="emit('delete', task.id)"
              @pointerdown.stop
            >
              <Trash2Icon class="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div class="mt-auto pt-1.5 flex items-center gap-1.5 min-h-[20px] overflow-hidden">
        <span
          v-for="label in visibleLabels"
          :key="label.id"
          class="h-5 max-w-[4.5rem] truncate rounded px-1.5 text-[10px] font-semibold text-white leading-5"
          :style="{ backgroundColor: label.color }"
          :title="label.name"
        >
          {{ label.name }}
        </span>
        <span
          v-if="extraLabelCount"
          class="text-[10px] font-medium text-muted-foreground"
        >
          +{{ extraLabelCount }}
        </span>
        <span
          class="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold tracking-wide ring-1 ring-inset shrink-0"
          :class="statusChip(task.status || 'TODO')"
        >
          {{ statusLabel(task.status || 'TODO') }}
        </span>
        <span
          class="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase ring-1 ring-inset shrink-0"
          :class="priorityChip(task.priority)"
        >
          {{ task.priority }}
        </span>
        <span
          v-if="due"
          class="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium shrink-0"
          :class="
            due.overdue
              ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
              : due.soon
                ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                : 'bg-muted text-muted-foreground'
          "
        >
          <CalendarIcon class="h-3 w-3" />
          {{ due.label }}
        </span>
        <span
          v-else-if="dateRange"
          class="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground shrink-0"
        >
          <CalendarIcon class="h-3 w-3" />
          {{ dateRange }}
        </span>
      </div>
    </div>

    <div
      class="flex items-center justify-between gap-2 border-t border-border px-3 py-1.5 bg-muted/60 shrink-0"
    >
      <div class="flex items-center gap-2.5 text-muted-foreground">
        <span
          class="inline-flex items-center gap-1 text-[11px]"
          :class="task.commentCount ? 'text-foreground/70' : ''"
        >
          <MessageSquareIcon class="h-3.5 w-3.5" />
          {{ task.commentCount }}
        </span>
        <span
          class="inline-flex items-center gap-1 text-[11px]"
          :class="task.attachmentCount ? 'text-foreground/70' : ''"
        >
          <PaperclipIcon class="h-3.5 w-3.5" />
          {{ task.attachmentCount }}
        </span>
        <button
          type="button"
          class="inline-flex items-center gap-1 text-[11px] transition"
          :class="
            task.likedByMe
              ? 'text-rose-600'
              : task.likeCount
                ? 'text-foreground/70 hover:text-rose-500'
                : 'hover:text-rose-500'
          "
          :disabled="preview"
          @click.stop="emit('like', task.id)"
          @pointerdown.stop
        >
          <HeartIcon
            class="h-3.5 w-3.5"
            :class="task.likedByMe ? 'fill-rose-600' : ''"
          />
          {{ task.likeCount }}
        </button>
      </div>

      <div v-if="task.members?.length" class="flex -space-x-1">
        <div
          v-for="member in task.members.slice(0, 3)"
          :key="member.id"
          class="h-6 w-6 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300 text-[10px] font-semibold overflow-hidden ring-2 ring-card shrink-0 flex items-center justify-center"
          :title="member.name || member.email"
        >
          <img
            v-if="member.imageUrl"
            :src="member.imageUrl"
            :alt="member.name || member.email"
            class="h-full w-full object-cover"
          />
          <span v-else>{{
            (member.name || member.email || "?").slice(0, 2).toUpperCase()
          }}</span>
        </div>
      </div>
      <div
        v-else-if="task.assignee"
        class="h-6 w-6 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300 text-[10px] font-semibold overflow-hidden ring-2 ring-card shrink-0 flex items-center justify-center"
        :title="task.assignee.name || task.assignee.email"
      >
        <img
          v-if="task.assignee.imageUrl"
          :src="task.assignee.imageUrl"
          :alt="task.assignee.name || task.assignee.email"
          class="h-full w-full object-cover"
        />
        <span v-else>{{ assigneeInitials }}</span>
      </div>
    </div>
  </div>
</template>
