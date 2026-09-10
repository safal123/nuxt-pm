<script setup lang="ts">
import {
  CalendarIcon,
  CheckIcon,
  MessageSquareIcon,
  PaperclipIcon,
  HeartIcon,
  GripVerticalIcon,
} from "lucide-vue-next";
import { format, isPast, isToday, isTomorrow, parseISO } from "date-fns";
import type { Task, TaskPriority } from "@/types";
import { priorityChip } from "@/utils/task-priority";
import { statusChip, statusLabel } from "@/utils/task-status";

const props = withDefaults(
  defineProps<{
    task: Task;
    preview?: boolean;
    canDrag?: boolean;
  }>(),
  { preview: false, canDrag: true },
);

const emit = defineEmits<{
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

const visibleLabels = computed(() => (props.task.labels || []).slice(0, 3));
const extraLabelCount = computed(() =>
  Math.max(0, (props.task.labels?.length || 0) - 3),
);

const isComplete = computed(() => props.task.status === "DONE");

const toggleComplete = async () => {
  if (props.preview) return;
  await boardStore.patchTask(props.task.id, {
    completed: props.task.status !== "DONE",
  });
};

const onPointerDown = (event: PointerEvent) => {
  if (props.preview) return;
  emit("pointerdown", event);
};
</script>

<template>
  <div
    v-if="isPlaceholder"
    class="rounded-xl border-2 border-dashed border-dropzone-border bg-dropzone"
    :style="{ height: `${boardStore.dragSize.height}px` }"
  />
  <div
    v-else
    class="group relative flex flex-col bg-card rounded-xl border border-border overflow-hidden touch-none"
    :class="[
      preview
        ? 'shadow-drag ring-1 ring-black/5 dark:ring-white/10'
        : 'shadow-sm hover:border-muted-foreground/30 hover:shadow-md',
      !preview && canDrag ? 'cursor-grab' : '',
      !preview && !canDrag ? 'cursor-pointer' : '',
      isComplete ? 'opacity-80' : '',
    ]"
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

    <div class="pl-3.5 pr-3 pt-3 pb-1.5 flex flex-col gap-1.5">
      <div class="flex items-start gap-2 min-h-0">
        <div v-if="!preview" class="relative mt-0.5 h-4 w-4 shrink-0">
          <GripVerticalIcon
            v-if="!isComplete"
            class="h-4 w-4 text-muted-foreground transition-opacity group-hover:opacity-0"
          />
          <button
            type="button"
            data-card-action
            class="absolute inset-0 z-10 inline-flex items-center justify-center rounded-full border transition"
            :class="
              isComplete
                ? 'border-emerald-500 bg-emerald-500 text-white'
                : 'border-muted-foreground/50 bg-card text-transparent opacity-0 group-hover:opacity-100 hover:border-emerald-500 hover:text-emerald-500'
            "
            :aria-label="isComplete ? 'Reopen card' : 'Mark as complete'"
            :title="isComplete ? 'Reopen' : 'Mark as complete'"
            @click.stop="toggleComplete"
            @pointerdown.stop.prevent
          >
            <CheckIcon class="h-2.5 w-2.5" />
          </button>
        </div>
        <p
          class="min-w-0 flex-1 text-[13px] font-medium text-foreground leading-snug line-clamp-2 break-words"
          :class="isComplete ? 'line-through text-muted-foreground' : ''"
        >
          {{ task.title }}
        </p>
      </div>

      <div class="flex items-center gap-1.5 overflow-hidden">
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
          {{ statusLabel(task.status || "TODO") }}
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
          data-card-action
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
          @pointerdown.stop.prevent
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
