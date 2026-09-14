<script setup lang="ts">
import { toast } from "vue-sonner";
import { defaultSprintDates, nextSprintNumber, sprintTitle } from "~/utils/sprints";

const sprintStore = useSprintStore();
const boardStore = useBoardStore();

const name = ref("");
const goal = ref("");
const plannedStartAt = ref("");
const plannedEndAt = ref("");
const pullBacklog = ref(false);
const saving = ref(false);

watch(
  () => sprintStore.startOpen,
  (open) => {
    if (!open) return;
    const dates = defaultSprintDates();
    const planned = [...sprintStore.plannedSprints].sort((a, b) => a.number - b.number)[0];
    name.value = planned?.name || sprintTitle(nextSprintNumber(sprintStore.sprints));
    goal.value = planned?.goal || "";
    plannedStartAt.value = planned?.plannedStartAt
      ? String(planned.plannedStartAt).slice(0, 10)
      : dates.plannedStartAt;
    plannedEndAt.value = planned?.plannedEndAt
      ? String(planned.plannedEndAt).slice(0, 10)
      : dates.plannedEndAt;
    pullBacklog.value = sprintStore.sprints.length === 0;
  },
);

const ignoreSelectOutside = (event: Event) => {
  const target = event.target as HTMLElement | null;
  if (
    target?.closest(
      "[data-radix-select-viewport], [data-radix-popper-content-wrapper]",
    )
  ) {
    event.preventDefault();
  }
};

const close = () => {
  sprintStore.startOpen = false;
};

const submit = async () => {
  const trimmed = name.value.trim();
  if (!trimmed || saving.value) return;
  saving.value = true;
  try {
    await sprintStore.startSprint({
      name: trimmed,
      goal: goal.value.trim() || null,
      plannedStartAt: plannedStartAt.value || null,
      plannedEndAt: plannedEndAt.value || null,
      pullBacklog: pullBacklog.value,
    });
    if (boardStore.projectId) await boardStore.fetchBoard(boardStore.projectId);
    toast.success("Sprint started");
  } catch (error: any) {
    toast.error("Could not start sprint", {
      description: error?.data?.message || "Please try again.",
    });
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <Dialog :open="sprintStore.startOpen" @update:open="sprintStore.startOpen = $event">
    <DialogContent
      class="max-w-md"
      @pointer-down-outside="ignoreSelectOutside"
      @focus-outside="ignoreSelectOutside"
      @interact-outside="ignoreSelectOutside"
    >
      <DialogHeader>
        <DialogTitle>Start sprint</DialogTitle>
        <DialogDescription>
          New cards on the board go into this sprint. Unassigned work stays in
          the backlog.
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-4 py-2">
        <div class="space-y-1.5">
          <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Name
          </p>
          <Input v-model="name" maxlength="64" placeholder="Sprint 1" />
        </div>
        <div class="space-y-1.5">
          <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Goal
          </p>
          <textarea
            v-model="goal"
            rows="3"
            placeholder="What should this sprint deliver?"
            class="min-h-[72px] w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div class="grid gap-3 sm:grid-cols-2">
          <div class="space-y-1.5">
            <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Start
            </p>
            <DatePicker v-model="plannedStartAt" placeholder="Start date" />
          </div>
          <div class="space-y-1.5">
            <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              End
            </p>
            <DatePicker v-model="plannedEndAt" placeholder="End date" />
          </div>
        </div>
        <label class="flex items-start gap-3 rounded-lg border border-border p-3">
          <Switch
            :checked="pullBacklog"
            class="mt-0.5"
            @update:checked="pullBacklog = $event"
          />
          <span class="min-w-0">
            <span class="block text-sm font-medium text-foreground">
              Pull incomplete backlog cards into this sprint
            </span>
            <span class="mt-0.5 block text-xs text-muted-foreground">
              Leave this off to start empty and plan from the backlog.
            </span>
          </span>
        </label>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" :disabled="saving" @click="close">
          Cancel
        </Button>
        <Button type="button" :disabled="saving || !name.trim()" @click="submit">
          {{ saving ? "Starting…" : "Start sprint" }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
