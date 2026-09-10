<script setup lang="ts">
import type { Task } from "@/types";
import AddKanbanColumn from "~/components/kanban/AddKanbanColumn.vue";
import { toast } from "vue-sonner";

const props = defineProps<{
  projectId: string;
}>();

const boardStore = useBoardStore();
const overlayEl = ref<HTMLElement | null>(null);

const archiveTask = async (taskId: string) => {
  try {
    await boardStore.archiveTask(taskId);
    await useWorkspaceStore().fetchArchive({ silent: true });
  } catch (error: any) {
    toast.error("Could not archive card", {
      description: error?.data?.message || "Please try again.",
    });
  }
};

const archiveList = async (columnId: string) => {
  try {
    await boardStore.archiveColumn(columnId);
    await useWorkspaceStore().fetchArchive({ silent: true });
    toast.success("List archived");
  } catch (error: any) {
    toast.error("Could not archive list", {
      description: error?.data?.message || "Please try again.",
    });
  }
};

watch(
  () => props.projectId,
  (id) => {
    if (id) boardStore.fetchBoard(id);
  },
  { immediate: true },
);

const DRAG_THRESHOLD = 6;

let pending = false;
let dragging = false;
let startX = 0;
let startY = 0;
let offsetX = 0;
let offsetY = 0;
let pendingTask: Task | null = null;
let pendingSize = { width: 0, height: 0 };
let raf = 0;
let latestX = 0;
let latestY = 0;
let pointerX = 0;
let pointerY = 0;
let lastDropColumnId = "";
let lastDropIndex = -1;

const applyOverlay = (x: number, y: number) => {
  if (!overlayEl.value) return;
  overlayEl.value.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(1.5deg)`;
  overlayEl.value.style.opacity = "1";
};

const updateDropTarget = (x: number, y: number) => {
  const el = document.elementFromPoint(x, y);
  const column = el?.closest("[data-column-id]") as HTMLElement | null;
  if (!column) return;

  const columnId = column.dataset.columnId;
  if (!columnId) return;

  const overSlot = el?.closest("[data-task-slot]") as HTMLElement | null;
  const slots = [...column.querySelectorAll<HTMLElement>("[data-task-slot]")];
  const draggingId = boardStore.draggingTask?.id;

  let nextIndex: number | null = null;

  if (overSlot?.dataset.taskId) {
    const overIndex = slots.findIndex(
      (slot) => slot.dataset.taskId === overSlot.dataset.taskId,
    );
    if (overIndex === -1) return;
    nextIndex = overIndex;
  } else if (!slots.length) {
    nextIndex = 0;
  } else {
    const last = slots[slots.length - 1];
    if (y > last.getBoundingClientRect().bottom) {
      const draggedHere = slots.some(
        (slot) => slot.dataset.taskId === draggingId,
      );
      nextIndex = draggedHere ? slots.length - 1 : slots.length;
    }
  }

  if (nextIndex === null) return;
  if (columnId === lastDropColumnId && nextIndex === lastDropIndex) return;
  lastDropColumnId = columnId;
  lastDropIndex = nextIndex;
  boardStore.moveDraggingTo(columnId, nextIndex);
};

const beginDrag = () => {
  if (!pendingTask) return;
  dragging = true;
  lastDropColumnId = "";
  lastDropIndex = -1;
  latestX = startX - offsetX;
  latestY = startY - offsetY;
  pointerX = startX;
  pointerY = startY;
  boardStore.startDrag(pendingTask, pendingSize);
  document.body.style.userSelect = "none";
  document.body.style.cursor = "grabbing";
  nextTick(() => applyOverlay(latestX, latestY));
};

const onPointerMove = (event: PointerEvent) => {
  if (!pending) return;

  if (!dragging) {
    const distance = Math.hypot(event.clientX - startX, event.clientY - startY);
    if (distance < DRAG_THRESHOLD) return;
    beginDrag();
  }

  latestX = event.clientX - offsetX;
  latestY = event.clientY - offsetY;
  pointerX = event.clientX;
  pointerY = event.clientY;

  if (!raf) {
    raf = requestAnimationFrame(() => {
      applyOverlay(latestX, latestY);
      updateDropTarget(pointerX, pointerY);
      raf = 0;
    });
  }
};

const cleanupListeners = () => {
  window.removeEventListener("pointermove", onPointerMove);
  window.removeEventListener("pointerup", onPointerUp);
  window.removeEventListener("pointercancel", onPointerUp);
};

const onPointerUp = () => {
  cleanupListeners();
  if (raf) {
    cancelAnimationFrame(raf);
    raf = 0;
  }
  document.body.style.userSelect = "";
  document.body.style.cursor = "";

  const clickedTask = pendingTask;
  const wasDragging = dragging;

  if (dragging) {
    updateDropTarget(pointerX, pointerY);
    boardStore.commitDrag();
  } else {
    boardStore.endDrag();
  }

  pending = false;
  dragging = false;
  pendingTask = null;

  if (!wasDragging && clickedTask) {
    boardStore.openTask(clickedTask);
  }
};

const onCardPointerDown = (event: PointerEvent, task: Task) => {
  if (event.button !== 0) return;
  if ((event.target as HTMLElement | null)?.closest("[data-card-action]")) {
    return;
  }
  const slot = (event.currentTarget as HTMLElement | null)?.closest(
    "[data-task-slot]",
  ) as HTMLElement | null;
  const rect = (
    slot ?? (event.currentTarget as HTMLElement | null)
  )?.getBoundingClientRect();
  if (!rect) return;

  event.preventDefault();
  pending = true;
  pendingTask = task;
  pendingSize = { width: rect.width, height: rect.height };
  startX = event.clientX;
  startY = event.clientY;
  offsetX = event.clientX - rect.left;
  offsetY = event.clientY - rect.top;

  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerUp);
};

onBeforeUnmount(() => {
  cleanupListeners();
  document.body.style.userSelect = "";
  document.body.style.cursor = "";
});

const skeletonColumns = [{ cards: 3 }, { cards: 2 }, { cards: 4 }];
const { view } = useProjectView();
</script>

<template>
  <div class="w-full min-w-0">
    <TaskTable v-if="view === 'table'" />
    <div
      v-else-if="boardStore.loading && !boardStore.columns.length"
      class="flex gap-4 overflow-x-auto items-start pb-2 w-full min-w-0"
    >
      <div
        v-for="(column, columnIndex) in skeletonColumns"
        :key="columnIndex"
        class="flex flex-col w-80 shrink-0 rounded-xl border border-border bg-muted max-h-[calc(100vh-12rem)]"
      >
        <div class="flex items-center gap-1 px-2 py-2">
          <Skeleton class="h-5 flex-1 rounded-md" />
          <Skeleton class="h-5 w-5 rounded-full shrink-0" />
          <Skeleton class="h-7 w-7 rounded-md shrink-0" />
        </div>
        <div class="flex-1 px-2 pb-2 flex flex-col gap-2 min-h-[88px]">
          <div
            v-for="card in column.cards"
            :key="card"
            class="flex flex-col rounded-xl border border-border bg-card overflow-hidden"
          >
            <div class="px-3.5 pt-3 pb-1.5 flex flex-col gap-1.5">
              <Skeleton class="h-3.5 w-4/5" />
              <div class="flex items-center gap-1.5">
                <Skeleton class="h-5 w-12 rounded-md" />
                <Skeleton class="h-5 w-14 rounded-md" />
                <Skeleton class="h-5 w-16 rounded-md" />
              </div>
            </div>
            <div
              class="flex items-center justify-between border-t border-border px-3 py-1.5 bg-muted/60"
            >
              <div class="flex items-center gap-2.5">
                <Skeleton class="h-3.5 w-8" />
                <Skeleton class="h-3.5 w-8" />
                <Skeleton class="h-3.5 w-8" />
              </div>
              <Skeleton class="h-6 w-6 rounded-full" />
            </div>
          </div>
        </div>
        <div class="p-2">
          <Skeleton class="h-8 w-24 rounded-lg" />
        </div>
      </div>
      <div class="w-72 shrink-0">
        <Skeleton class="h-11 w-full rounded-xl" />
      </div>
    </div>
    <div
      v-else
      class="flex gap-4 overflow-x-auto items-start pb-2 w-full min-w-0"
    >
      <KanbanColumn
        v-for="(column, index) in boardStore.columns"
        :key="column.id"
        :column="column"
        :is-first="index === 0"
        :is-last="index === boardStore.columns.length - 1"
        @add-task="boardStore.addTask"
        @rename="boardStore.renameColumn"
        @move="boardStore.moveColumn"
        @set-color="boardStore.setColumnColor"
        @archive="archiveList"
        @archive-task="archiveTask"
        @like-task="boardStore.toggleLike"
        @pointerdown="onCardPointerDown"
      />
      <AddKanbanColumn @add="boardStore.addColumn" />
    </div>

    <Teleport to="body">
      <div
        v-if="boardStore.draggingTask"
        ref="overlayEl"
        class="pointer-events-none fixed left-0 top-0 z-[9999] will-change-transform opacity-0"
        :style="{ width: `${boardStore.dragSize.width}px` }"
      >
        <TaskCard :task="boardStore.draggingTask" preview />
      </div>
    </Teleport>
    <TaskDetailModal />
  </div>
</template>
