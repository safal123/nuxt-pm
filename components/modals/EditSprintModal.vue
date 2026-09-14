<script setup lang="ts">
import { toast } from "vue-sonner";
import { toSprintInputDate } from "~/utils/sprints";

const sprintStore = useSprintStore();

const plannedStartAt = ref("");
const plannedEndAt = ref("");
const saving = ref(false);

watch(
  () => sprintStore.editOpen,
  (open) => {
    if (!open) return;
    const sprint = sprintStore.editableSprint;
    plannedStartAt.value = toSprintInputDate(sprint?.plannedStartAt);
    plannedEndAt.value = toSprintInputDate(sprint?.plannedEndAt);
  },
);

const ignoreSelectOutside = (event: Event) => {
  const target = event.target as HTMLElement | null;
  if (target?.closest("[data-radix-popper-content-wrapper]")) {
    event.preventDefault();
  }
};

const close = () => {
  sprintStore.editOpen = false;
};

const submit = async () => {
  const sprint = sprintStore.editableSprint;
  if (!sprint || saving.value) return;
  saving.value = true;
  try {
    await sprintStore.updateSprint(sprint.id, {
      plannedStartAt: plannedStartAt.value || null,
      plannedEndAt: plannedEndAt.value || null,
    });
    toast.success("Sprint dates updated");
  } catch (error: any) {
    toast.error("Could not update sprint dates", {
      description: error?.data?.message || "Please try again.",
    });
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <Dialog :open="sprintStore.editOpen" @update:open="sprintStore.editOpen = $event">
    <DialogContent
      class="max-w-md"
      @pointer-down-outside="ignoreSelectOutside"
      @focus-outside="ignoreSelectOutside"
      @interact-outside="ignoreSelectOutside"
    >
      <DialogHeader>
        <DialogTitle>Edit sprint dates</DialogTitle>
        <DialogDescription>
          {{ sprintStore.editableSprint?.name || "Sprint" }}
        </DialogDescription>
      </DialogHeader>

      <div class="grid gap-3 py-2 sm:grid-cols-2">
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

      <DialogFooter>
        <Button type="button" variant="outline" :disabled="saving" @click="close">
          Cancel
        </Button>
        <Button type="button" :disabled="saving" @click="submit">
          {{ saving ? "Saving…" : "Save dates" }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
