<script setup lang="ts">
import {
  ArrowLeftIcon,
  Loader2Icon,
  RefreshCwIcon,
  SparklesIcon,
  Trash2Icon,
} from "lucide-vue-next";
import { toast } from "vue-sonner";
import { toTypedSchema } from "@vee-validate/zod";
import type { AiPlanTask, TaskPriority } from "~/types";
import { aiTaskPlanRequestSchema } from "~/server/utils/schemas";
import { AI_PLAN_GOAL_MAX } from "~/utils/ai-plan";
import { TASK_PRIORITIES, priorityChip } from "~/utils/task-priority";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const store = useModalsStore();
const boardStore = useBoardStore();

const open = computed(() => store.isOpen && store.modalName === "aiTaskPlan");
const columnId = computed(() => String(store.modalProps.columnId || ""));
const columnName = computed(() => String(store.modalProps.columnName || "To Do"));

const step = ref<"describe" | "review">("describe");
const goal = ref("");
const drafts = ref<(AiPlanTask & { description: string })[]>([]);
const drafting = ref(false);
const creating = ref(false);
const formKey = ref(0);
const busy = computed(() => drafting.value || creating.value);

const formSchema = toTypedSchema(aiTaskPlanRequestSchema.pick({ goal: true }));

watch(open, (value) => {
  if (!value) return;
  step.value = "describe";
  goal.value = "";
  drafts.value = [];
  drafting.value = false;
  creating.value = false;
  formKey.value += 1;
});

const close = () => {
  if (busy.value) return;
  store.closeModal();
};

const draft = async (text: string) => {
  drafting.value = true;
  try {
    const tasks = await boardStore.draftAiPlan(columnId.value, text);
    drafts.value = tasks.map((task) => ({ ...task, description: task.description ?? "" }));
    goal.value = text;
    step.value = "review";
  } catch (error: any) {
    toast.error("Could not plan these tasks", {
      description: error?.data?.message || "Please try again.",
    });
  } finally {
    drafting.value = false;
  }
};

async function onSubmit(values: any) {
  if (busy.value) return;
  await draft(values.goal);
}

const regenerate = () => {
  if (busy.value || !goal.value) return;
  void draft(goal.value);
};

const removeDraft = (index: number) => {
  drafts.value.splice(index, 1);
};

const setPriority = (index: number, value: unknown) => {
  const item = drafts.value[index];
  if (item && typeof value === "string") item.priority = value as TaskPriority;
};

const createTasks = async () => {
  if (busy.value || !drafts.value.length) return;
  creating.value = true;
  try {
    const tasks = await boardStore.applyAiPlan(columnId.value, goal.value, drafts.value);
    store.closeModal();
    toast.success(`Created ${tasks.length} tasks`, {
      description: `Added to ${columnName.value}.`,
    });
  } catch (error: any) {
    toast.error("Could not create these tasks", {
      description: error?.data?.message || "Please try again.",
    });
  } finally {
    creating.value = false;
  }
};
</script>

<template>
  <Dialog :open="open" @update:open="(value) => { if (!value) close() }">
    <DialogContent class="flex max-h-[90vh] max-w-2xl flex-col">
      <DialogHeader>
        <div class="flex items-start gap-3">
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted"
          >
            <SparklesIcon class="h-5 w-5 text-foreground" />
          </div>
          <div class="space-y-1.5 text-left">
            <DialogTitle>Plan with AI</DialogTitle>
            <DialogDescription v-if="step === 'describe'">
              Explain what you want to get done. AI breaks it into ordered,
              bite-sized tasks with steps for {{ columnName }}.
            </DialogDescription>
            <DialogDescription v-else>
              Review the plan. Edit, remove, or regenerate before anything is
              added to {{ columnName }}.
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <Form
        v-if="step === 'describe'"
        :key="formKey"
        v-slot="{ handleSubmit }"
        as=""
        :validation-schema="formSchema"
        :initial-values="{ goal }"
      >
        <form
          id="aiTaskPlanForm"
          class="space-y-2"
          @submit="handleSubmit($event, onSubmit)"
        >
          <FormField v-slot="{ componentField }" name="goal">
            <FormItem>
              <FormLabel>What needs to happen?</FormLabel>
              <FormControl>
                <Textarea
                  rows="7"
                  :maxlength="AI_PLAN_GOAL_MAX"
                  placeholder="Launch a pricing page for the new Team plan. It needs a comparison table, Stripe checkout for monthly and yearly, an FAQ, and analytics on the upgrade button."
                  v-bind="componentField"
                  :disabled="drafting"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>
          <p class="text-xs text-muted-foreground">
            Mention the outcome, constraints, and anything already done. More
            detail gives a sharper breakdown.
          </p>
        </form>
      </Form>

      <div v-else class="-mx-6 min-h-0 flex-1 overflow-y-auto px-6">
        <p
          v-if="!drafts.length"
          class="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground"
        >
          Every task was removed. Regenerate or go back to change the goal.
        </p>
        <ol class="space-y-3">
          <li
            v-for="(item, index) in drafts"
            :key="index"
            class="rounded-lg border border-border bg-card p-3"
          >
            <div class="flex items-start gap-2">
              <span
                class="mt-2 inline-flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-muted px-1 text-[11px] font-medium text-muted-foreground"
              >
                {{ index + 1 }}
              </span>
              <Input
                v-model="item.title"
                class="h-9 flex-1 font-medium"
                :disabled="creating"
                aria-label="Task title"
              />
              <Select
                :model-value="item.priority"
                :disabled="creating"
                @update:model-value="setPriority(index, $event)"
              >
                <SelectTrigger class="h-9 w-[120px] shrink-0">
                  <SelectValue>
                    <span
                      class="rounded px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset"
                      :class="priorityChip(item.priority)"
                    >
                      {{ TASK_PRIORITIES.find((p) => p.id === item.priority)?.label }}
                    </span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="priority in TASK_PRIORITIES"
                    :key="priority.id"
                    :value="priority.id"
                  >
                    {{ priority.label }}
                  </SelectItem>
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                class="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                :disabled="creating"
                aria-label="Remove task"
                @click="removeDraft(index)"
              >
                <Trash2Icon class="h-4 w-4" />
              </Button>
            </div>
            <Textarea
              v-model="item.description"
              rows="5"
              class="mt-2 text-[13px] leading-relaxed"
              :disabled="creating"
              aria-label="Task description"
            />
          </li>
        </ol>
      </div>

      <DialogFooter class="gap-2 sm:justify-between">
        <template v-if="step === 'describe'">
          <Button type="button" variant="outline" :disabled="drafting" @click="close">
            Cancel
          </Button>
          <Button type="submit" form="aiTaskPlanForm" :disabled="drafting">
            <Loader2Icon v-if="drafting" class="h-4 w-4 animate-spin" />
            <SparklesIcon v-else class="h-4 w-4" />
            {{ drafting ? "Breaking it down…" : "Generate plan" }}
          </Button>
        </template>
        <template v-else>
          <div class="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              :disabled="busy"
              @click="step = 'describe'"
            >
              <ArrowLeftIcon class="h-4 w-4" />
              Edit goal
            </Button>
            <Button type="button" variant="outline" :disabled="busy" @click="regenerate">
              <RefreshCwIcon class="h-4 w-4" :class="drafting && 'animate-spin'" />
              {{ drafting ? "Regenerating…" : "Regenerate" }}
            </Button>
          </div>
          <Button type="button" :disabled="busy || !drafts.length" @click="createTasks">
            <Loader2Icon v-if="creating" class="h-4 w-4 animate-spin" />
            {{
              creating
                ? "Creating…"
                : `Create ${drafts.length} ${drafts.length === 1 ? "task" : "tasks"}`
            }}
          </Button>
        </template>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
