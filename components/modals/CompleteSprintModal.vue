<script setup lang="ts">
import { toast } from "vue-sonner";
import type { UnfinishedDestination } from "~/types";

const sprintStore = useSprintStore();
const boardStore = useBoardStore();

const destination = ref<UnfinishedDestination>("backlog");
const saving = ref(false);

watch(
  () => sprintStore.completeOpen,
  (open) => {
    if (open) destination.value = "backlog";
  },
);

const close = () => {
  sprintStore.completeOpen = false;
};

const submit = async () => {
  if (saving.value) return;
  saving.value = true;
  try {
    await sprintStore.completeSprint(destination.value);
    if (boardStore.projectId) await boardStore.fetchBoard(boardStore.projectId);
    toast.success("Sprint completed", {
      description:
        destination.value === "next"
          ? "Unfinished cards moved to the next sprint."
          : "Unfinished cards moved to the backlog.",
    });
  } catch (error: any) {
    toast.error("Could not complete sprint", {
      description: error?.data?.message || "Please try again.",
    });
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <Dialog
    :open="sprintStore.completeOpen"
    @update:open="sprintStore.completeOpen = $event"
  >
    <DialogContent class="max-w-md">
      <DialogHeader>
        <DialogTitle>Complete {{ sprintStore.current?.name || "sprint" }}</DialogTitle>
        <DialogDescription>
          Finished cards stay on this sprint so you can review them later. Move
          unfinished work to the backlog or the next sprint.
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-2">
        <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Unfinished cards
        </p>
        <label
          class="flex items-start gap-3 rounded-lg border border-border p-3"
          :class="destination === 'backlog' ? 'ring-1 ring-foreground' : ''"
        >
          <input
            v-model="destination"
            type="radio"
            value="backlog"
            class="mt-1"
          />
          <span class="min-w-0">
            <span class="block text-sm font-medium text-foreground">Backlog</span>
            <span class="mt-0.5 block text-xs text-muted-foreground">
              Keep leftover work unassigned until you plan the next sprint.
            </span>
          </span>
        </label>
        <label
          class="flex items-start gap-3 rounded-lg border border-border p-3"
          :class="destination === 'next' ? 'ring-1 ring-foreground' : ''"
        >
          <input
            v-model="destination"
            type="radio"
            value="next"
            class="mt-1"
          />
          <span class="min-w-0">
            <span class="block text-sm font-medium text-foreground">Next sprint</span>
            <span class="mt-0.5 block text-xs text-muted-foreground">
              Carry unfinished cards into the next planned sprint.
            </span>
          </span>
        </label>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" :disabled="saving" @click="close">
          Cancel
        </Button>
        <Button type="button" :disabled="saving" @click="submit">
          {{ saving ? "Completing…" : "Complete sprint" }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
