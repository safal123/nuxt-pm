<script setup lang="ts">
import {
  ArchiveIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MoreHorizontalIcon,
  PaletteIcon,
  PlusIcon,
} from "lucide-vue-next";
import type { Task, TaskColumn } from "@/types";
import { TASK_COLORS, colorValue } from "@/utils/task-colors";
import { Button } from "@/components/ui/button";

const props = defineProps<{
  column: TaskColumn;
  visibleTasks?: Task[];
  filtered?: boolean;
  canDrag?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
}>();

const emit = defineEmits<{
  (e: "add-task", columnId: string, title: string): void;
  (e: "rename", columnId: string, name: string): void;
  (e: "move", columnId: string, direction: "left" | "right"): void;
  (e: "set-color", columnId: string, color: string | null): void;
  (e: "archive", columnId: string): void;
  (e: "archive-task", taskId: string): void;
  (e: "like-task", taskId: string): void;
  (e: "pointerdown", event: PointerEvent, task: Task): void;
}>();

const boardStore = useBoardStore();

const isAdding = ref(false);
const isEditing = ref(false);
const newTaskTitle = ref("");
const nameDraft = ref(props.column.name);
const inputRef = ref<HTMLInputElement | null>(null);
const nameInputRef = ref<HTMLInputElement | null>(null);

watch(
  () => props.column.name,
  (name) => {
    if (!isEditing.value) nameDraft.value = name;
  },
);

const shownTasks = computed(() => props.visibleTasks ?? props.column.tasks);

const isDropTarget = computed(
  () => boardStore.draggingTask?.columnId === props.column.id,
);

const hiddenCompleted = computed(() =>
  Math.max(
    0,
    (props.column.completedCount ?? 0) -
      props.column.tasks.filter((task) => task.status === "DONE").length,
  ),
);
const loadingMore = ref(false);

const loadMoreCompleted = async () => {
  if (loadingMore.value || hiddenCompleted.value <= 0) return;
  loadingMore.value = true;
  try {
    await boardStore.loadMoreCompleted(props.column.id);
  } finally {
    loadingMore.value = false;
  }
};

const columnTint = computed(() => {
  if (!props.column.color) return undefined;
  return colorValue(props.column.color);
});

const startAdding = async () => {
  isAdding.value = true;
  await nextTick();
  inputRef.value?.focus();
};

const submitTask = () => {
  const title = newTaskTitle.value.trim();
  if (title) {
    emit("add-task", props.column.id, title);
  }
  newTaskTitle.value = "";
  isAdding.value = false;
};

const cancelAdding = () => {
  newTaskTitle.value = "";
  isAdding.value = false;
};

const startEditing = async () => {
  isEditing.value = true;
  nameDraft.value = props.column.name;
  await nextTick();
  nameInputRef.value?.focus();
  nameInputRef.value?.select();
};

const saveName = () => {
  const next = nameDraft.value.trim();
  isEditing.value = false;
  if (!next) {
    nameDraft.value = props.column.name;
    return;
  }
  emit("rename", props.column.id, next);
};
</script>

<template>
  <div
    :data-column-id="column.id"
    class="flex flex-col w-80 shrink-0 rounded-xl border max-h-[calc(100vh-12rem)]"
    :class="[
      isDropTarget
        ? 'border-dropzone-border ring-1 ring-inset ring-dropzone-border'
        : 'border-border',
      !columnTint && (isDropTarget ? 'bg-dropzone' : 'bg-muted'),
    ]"
    :style="columnTint ? { backgroundColor: `${columnTint}2e` } : undefined"
  >
    <div
      class="flex items-center gap-1 px-2 py-2 rounded-t-xl"
      :style="columnTint ? { backgroundColor: `${columnTint}55` } : undefined"
    >
      <input
        v-if="isEditing"
        ref="nameInputRef"
        v-model="nameDraft"
        class="min-w-0 flex-1 h-7 rounded-md border border-input bg-background px-2 text-[13px] font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        @blur="saveName"
        @keyup.enter="saveName"
        @keyup.esc="
          isEditing = false;
          nameDraft = column.name;
        "
        @pointerdown.stop
      />
      <button
        v-else
        type="button"
        class="min-w-0 flex-1 text-left text-[13px] font-semibold text-foreground tracking-tight truncate px-1 rounded-md hover:bg-background/70"
        @click="startEditing"
        @pointerdown.stop
      >
        {{ column.name }}
      </button>

      <span
        class="text-[11px] font-medium text-muted-foreground bg-background/80 border border-border rounded-full min-w-[1.25rem] h-5 px-1.5 inline-flex items-center justify-center shrink-0"
      >
        {{ shownTasks.length }}
        <span v-if="filtered && shownTasks.length !== column.tasks.length">
          /{{ column.tasks.length }}
        </span>
      </span>

      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <button
            type="button"
            class="h-7 w-7 shrink-0 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-background/80 hover:text-foreground"
            aria-label="List actions"
            @pointerdown.stop
          >
            <MoreHorizontalIcon class="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          class="w-56 rounded-lg"
          side="bottom"
          align="end"
          @pointerdown.stop
        >
          <DropdownMenuItem @select="startAdding">
            <PlusIcon class="h-4 w-4" />
            Add card
          </DropdownMenuItem>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger class="gap-2">
              <PaletteIcon class="h-4 w-4 shrink-0" />
              Background color
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent class="w-52 p-2">
              <div class="grid grid-cols-5 gap-1.5">
                <button
                  v-for="color in TASK_COLORS"
                  :key="color.id"
                  type="button"
                  class="h-7 w-7 rounded-md ring-offset-1 transition hover:scale-105"
                  :class="
                    column.color === color.id
                      ? 'ring-2 ring-foreground'
                      : 'ring-1 ring-border'
                  "
                  :style="{ backgroundColor: color.value }"
                  :title="color.name"
                  @click="emit('set-color', column.id, color.id)"
                >
                  <CheckIcon
                    v-if="column.color === color.id"
                    class="h-3.5 w-3.5 mx-auto text-white drop-shadow"
                  />
                </button>
              </div>
              <button
                type="button"
                class="mt-2 w-full rounded-md px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-accent"
                @click="emit('set-color', column.id, null)"
              >
                Remove color
              </button>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            :disabled="isFirst"
            @select="emit('move', column.id, 'left')"
          >
            <ChevronLeftIcon class="h-4 w-4" />
            Move left
          </DropdownMenuItem>
          <DropdownMenuItem
            :disabled="isLast"
            @select="emit('move', column.id, 'right')"
          >
            <ChevronRightIcon class="h-4 w-4" />
            Move right
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            class="text-red-600 focus:text-red-600"
            @select="emit('archive', column.id)"
          >
            <ArchiveIcon class="h-4 w-4" />
            Archive list
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>

    <div
      data-task-list
      class="mt-2 flex-1 overflow-y-auto px-2 pb-2 flex flex-col gap-2 min-h-[88px]"
    >
      <p
        v-if="filtered && !shownTasks.length"
        class="px-1 py-6 text-center text-[12px] text-muted-foreground"
      >
        No matching cards
      </p>
      <div
        v-for="task in shownTasks"
        :key="task.id"
        data-task-slot
        :data-task-id="task.id"
        @pointerdown="emit('pointerdown', $event, task)"
      >
        <TaskCard
          :task="task"
          :can-drag="canDrag"
          @like="emit('like-task', $event)"
        />
      </div>
      <Button
        v-if="hiddenCompleted > 0 && !filtered"
        type="button"
        variant="ghost"
        size="sm"
        class="w-full justify-center text-[12px] text-muted-foreground"
        :disabled="loadingMore"
        @click="loadMoreCompleted"
      >
        {{
          loadingMore
            ? "Loading…"
            : `Show ${hiddenCompleted} more completed`
        }}
      </Button>
    </div>

    <div class="p-2">
      <div v-if="isAdding" class="flex flex-col gap-2">
        <input
          ref="inputRef"
          v-model="newTaskTitle"
          placeholder="Task title"
          class="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          @keyup.enter="submitTask"
          @keyup.esc="cancelAdding"
          @blur="submitTask"
        />
      </div>
      <button
        v-else
        type="button"
        class="w-full flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground hover:bg-background/80 rounded-lg px-2 py-1.5 transition"
        @click="startAdding"
      >
        <PlusIcon class="h-4 w-4" />
        Add task
      </button>
    </div>
  </div>
</template>
