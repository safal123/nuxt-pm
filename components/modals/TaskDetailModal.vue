<script setup lang="ts">
import {
  AlignLeftIcon,
  CheckIcon,
  ArchiveIcon,
  HistoryIcon,
  Loader2Icon,
  MessageSquareIcon,
  PaperclipIcon,
  PlusIcon,
  SparklesIcon,
  UserIcon,
  XIcon,
} from "lucide-vue-next";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { toast } from "vue-sonner";
import type { TaskAssignee, TaskLabel, TaskPriority, TaskStatus, WorkspaceActivity } from "@/types";
import { statusChip, statusLabel } from "@/utils/task-status";
import { isHistoricSprint } from "~/utils/sprints";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type TaskTab = "details" | "summary" | "members" | "files" | "comments" | "activity";

const TABS: { id: TaskTab; label: string; icon: typeof UserIcon }[] = [
  { id: "details", label: "Details", icon: AlignLeftIcon },
  { id: "members", label: "Members", icon: UserIcon },
  { id: "files", label: "Files", icon: PaperclipIcon },
  { id: "comments", label: "Comments", icon: MessageSquareIcon },
  { id: "activity", label: "Activity", icon: HistoryIcon },
  { id: "summary", label: "Summary", icon: SparklesIcon },
];

const boardStore = useBoardStore();
const userStore = useUserStore();
const workspaceStore = useWorkspaceStore();
const sprintStore = useSprintStore();
const { openTimeline } = useActivityTimeline();

const task = computed(() => boardStore.selectedTask);
const open = computed({
  get: () => !!boardStore.selectedTask,
  set: (value: boolean) => {
    if (!value) boardStore.closeTask();
  },
});

const activeTab = ref<TaskTab>("details");
const titleDraft = ref("");
const descriptionDraft = ref("");
const commentDraft = ref("");
const dueDraft = ref("");
const savingComment = ref(false);
const dateSaved = ref(false);
const dueReady = ref(false);
const saving = reactive({
  title: false,
  status: false,
  priority: false,
  due: false,
  sprint: false,
  description: false,
  labels: false,
  members: false,
});

const withSave = async (key: keyof typeof saving, run: () => Promise<void>) => {
  if (saving[key]) return;
  saving[key] = true;
  try {
    await run();
  } finally {
    saving[key] = false;
  }
};
const newLabelName = ref("");
const newLabelColor = ref(TASK_COLORS[4].value);
const creatingLabel = ref(false);
const labelError = ref("");

const toInputDate = (value: Date | string | null | undefined) => {
  if (!value) return "";
  const date = typeof value === "string" ? parseISO(value) : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return format(date, "yyyy-MM-dd");
};

watch(
  () => task.value?.id,
  async () => {
    if (!task.value) return;
    dueReady.value = false;
    dateSaved.value = false;
    titleDraft.value = task.value.title;
    descriptionDraft.value = task.value.description ?? "";
    dueDraft.value = toInputDate(task.value.dueDate);
    activeTab.value = "details";
    commentDraft.value = "";
    labelError.value = "";
    await nextTick();
    dueReady.value = true;
    const workspaceId = workspaceStore.activeWorkspaceId || userStore.user?.activeWorkspaceId;
    if (workspaceId) await boardStore.fetchWorkspaceMembers(workspaceId);
    if (task.value.projectId) {
      await Promise.all([
        boardStore.fetchLabels(task.value.projectId),
        boardStore.fetchProjectMembers(task.value.projectId),
      ]);
    }
  },
);

const columnName = computed(
  () =>
    task.value?.columnName ||
    boardStore.columns.find((column) => column.id === task.value?.columnId)?.name ||
    "list",
);

const creatorName = computed(
  () => task.value?.creator?.name || task.value?.creator?.email || "Unknown",
);

const createdAtLabel = computed(() => {
  if (!task.value?.createdAt) return null;
  const date =
    typeof task.value.createdAt === "string"
      ? parseISO(task.value.createdAt)
      : new Date(task.value.createdAt);
  if (Number.isNaN(date.getTime())) return null;
  return {
    relative: formatDistanceToNow(date, { addSuffix: true }),
    exact: format(date, "MMM d, yyyy · h:mm a"),
  };
});

const initials = (person: TaskAssignee) => {
  const name = person.name || person.email || "";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase() || "?";
};

const isMember = (userId: string) =>
  task.value?.members?.some((member) => member.id === userId) ?? false;

const assignableMembers = computed(() =>
  boardStore.projectMembers.length
    ? boardStore.projectMembers
    : boardStore.workspaceMembers,
);

const hasLabel = (labelId: string) =>
  task.value?.labels?.some((label) => label.id === labelId) ?? false;

const saveTitle = async () => {
  if (!task.value) return;
  const next = titleDraft.value.trim();
  if (!next || next === task.value.title) return;
  await withSave("title", () =>
    boardStore.patchTask(task.value!.id, { title: next }),
  );
};

const saveDescription = async () => {
  if (!task.value) return;
  const next = descriptionDraft.value.trim() || null;
  if (next === (task.value.description ?? null)) return;
  await withSave("description", () =>
    boardStore.patchTask(task.value!.id, { description: next }),
  );
};

const saveDueDate = async (value: string) => {
  if (!task.value || !dueReady.value) return;
  if (value === toInputDate(task.value.dueDate)) return;
  dateSaved.value = false;
  await withSave("due", async () => {
    await boardStore.patchTask(task.value!.id, {
      dueDate: value ? new Date(`${value}T12:00:00`).toISOString() : null,
    });
    dateSaved.value = true;
  });
};

watch(dueDraft, (value) => {
  void saveDueDate(value);
});

const toggleLabel = async (label: TaskLabel) => {
  if (!task.value) return;
  const current = task.value.labels ?? [];
  const labelIds = current.some((item) => item.id === label.id)
    ? current.filter((item) => item.id !== label.id).map((item) => item.id)
    : [...current.map((item) => item.id), label.id];
  await withSave("labels", () =>
    boardStore.patchTask(task.value!.id, { labelIds }),
  );
};

const createLabel = async () => {
  if (!task.value || !newLabelName.value.trim()) return;
  creatingLabel.value = true;
  labelError.value = "";
  try {
    await boardStore.createLabel(newLabelName.value.trim(), newLabelColor.value, task.value.id);
    newLabelName.value = "";
    if (task.value) await boardStore.openTask(task.value);
  } catch (error: any) {
    labelError.value = error?.data?.message || error?.message || "Could not create label.";
  } finally {
    creatingLabel.value = false;
  }
};

const toggleMember = async (person: TaskAssignee) => {
  if (!task.value) return;
  const current = task.value.members ?? [];
  const memberIds = current.some((member) => member.id === person.id)
    ? current.filter((member) => member.id !== person.id).map((member) => member.id)
    : [...current.map((member) => member.id), person.id];
  await withSave("members", () =>
    boardStore.patchTask(task.value!.id, { memberIds }),
  );
};

const setPriority = async (priority: TaskPriority) => {
  if (!task.value || task.value.priority === priority) return;
  await withSave("priority", () =>
    boardStore.patchTask(task.value!.id, { priority }),
  );
};

const setStatus = async (status: TaskStatus) => {
  if (!task.value || task.value.status === status) return;
  await withSave("status", () =>
    boardStore.patchTask(task.value!.id, { status }),
  );
};

const sprintOptions = computed(() =>
  sprintStore.sprints.filter((sprint) => !isHistoricSprint(sprint.status)),
);

const assignedClosedSprint = computed(() => {
  const id = task.value?.sprintId;
  if (!id) return null;
  const sprint = sprintStore.sprints.find((item) => item.id === id);
  return sprint && isHistoricSprint(sprint.status) ? sprint : null;
});

const setSprint = async (value: unknown) => {
  if (!task.value || typeof value !== "string") return;
  const sprintId = value === "backlog" ? null : value;
  if ((task.value.sprintId ?? null) === sprintId) return;
  await withSave("sprint", () =>
    boardStore.patchTask(task.value!.id, { sprintId }),
  );
};

const isComplete = computed(() => task.value?.status === "DONE");
const completing = ref(false);

const toggleComplete = async () => {
  if (!task.value || completing.value) return;
  completing.value = true;
  try {
    await boardStore.patchTask(task.value.id, {
      completed: task.value.status !== "DONE",
    });
  } catch (error: any) {
    toast.error("Could not update the card", {
      description: error?.data?.message || "Please try again.",
    });
  } finally {
    completing.value = false;
  }
};

const submitComment = async () => {
  const content = commentDraft.value.trim();
  if (!task.value || !content || savingComment.value) return;
  savingComment.value = true;
  try {
    await boardStore.addComment(task.value.id, content);
    commentDraft.value = "";
  } catch (error: any) {
    toast.error("Could not add comment", {
      description: error?.data?.message || "Please try again.",
    });
  } finally {
    savingComment.value = false;
  }
};

const canArchive = computed(
  () => !!task.value && task.value.createdBy === userStore.user?.id,
);

const archiveCard = async () => {
  if (!task.value || !canArchive.value) return;
  const id = task.value.id;
  try {
    await boardStore.archiveTask(id);
  } catch (error: any) {
    toast.error("Could not archive card", {
      description: error?.data?.message || "Please try again.",
    });
  }
};

const comments = computed(() =>
  [...(task.value?.comments ?? [])].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  ),
);
const projectName = computed(() => {
  const id = task.value?.projectId;
  return (
    workspaceStore.getActiveWorkspace?.projects?.find(
      (project) => project.id === id,
    )?.name || "Project"
  );
});
const cardTimeline = computed<WorkspaceActivity[]>(() =>
  (task.value?.activities ?? []).map((item) => ({
    ...item,
    task: task.value ? { id: task.value.id, title: task.value.title } : null,
    project: task.value
      ? { id: task.value.projectId, name: projectName.value }
      : null,
    email: null,
  })),
);

const openCardTimeline = () => {
  if (!task.value) return;
  openTimeline({
    kind: "task",
    id: task.value.id,
    name: task.value.title,
  });
};

const commentWhen = (value: Date | string) => {
  const date = typeof value === "string" ? new Date(value) : value;
  return {
    relative: formatDistanceToNow(date, { addSuffix: true }),
    exact: format(date, "MMM d, yyyy · h:mm a"),
  };
};

const ignoreSelectOutside = (event: Event) => {
  const target = event.target as HTMLElement | null;
  if (target?.closest("[data-radix-select-viewport], [data-radix-popper-content-wrapper]")) {
    event.preventDefault();
  }
};
</script>

<template>
  <Dialog :open="open" @update:open="open = $event">
    <DialogContent
      v-if="task"
      class="flex h-[min(720px,90vh)] w-full max-w-2xl flex-col overflow-hidden p-0 gap-0 [&>button]:hidden"
      @pointer-down-outside="ignoreSelectOutside"
      @focus-outside="ignoreSelectOutside"
      @interact-outside="ignoreSelectOutside"
    >
      <div class="absolute right-3 top-2.5 z-20 flex items-center gap-1">
        <TaskCoverPicker
          :task="task"
          :overlay="Boolean(task.coverImage || task.coverColor)"
        />
        <DialogClose
          class="flex size-7 items-center justify-center rounded-md border border-border bg-background text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground"
          :class="
            task.coverImage || task.coverColor
              ? 'border-white/20 bg-black/40 text-white hover:bg-black/55 hover:text-white'
              : ''
          "
        >
          <XIcon class="size-3.5" />
          <span class="sr-only">Close</span>
        </DialogClose>
      </div>
      <div v-if="task.coverImage" class="relative h-40 w-full shrink-0">
        <img
          :src="task.coverImage"
          :alt="task.coverCredit ? `Photo by ${task.coverCredit}` : 'Card cover'"
          class="h-full w-full object-cover"
        />
        <a
          v-if="task.coverCredit && task.coverCreditUrl"
          :href="task.coverCreditUrl"
          target="_blank"
          rel="noreferrer"
          class="absolute bottom-2 right-2 rounded-md bg-black/55 px-2 py-1 text-[10px] text-white hover:bg-black/70"
        >
          Photo by {{ task.coverCredit }} on Unsplash
        </a>
      </div>
      <div
        v-else-if="task.coverColor"
        class="h-24 w-full shrink-0"
        :style="{ backgroundColor: colorValue(task.coverColor) }"
      />

      <div
        class="shrink-0 px-5 pt-4"
        :class="task.coverImage || task.coverColor ? '' : 'pr-20'"
      >
        <div class="flex items-center gap-2.5">
          <button
            type="button"
            class="h-6 w-6 shrink-0 inline-flex items-center justify-center rounded-full border transition-colors"
            :class="
              completing
                ? 'border-primary text-primary'
                : isComplete
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-muted-foreground/35 text-transparent hover:border-primary hover:text-primary'
            "
            :aria-label="isComplete ? 'Reopen card' : 'Mark as complete'"
            :title="isComplete ? 'Reopen' : 'Mark as complete'"
            :disabled="completing"
            @click="toggleComplete"
          >
            <Loader2Icon v-if="completing" class="h-3.5 w-3.5 animate-spin" />
            <CheckIcon v-else class="h-3.5 w-3.5" />
          </button>
          <input
            v-model="titleDraft"
            class="-ml-0.5 min-w-0 flex-1 rounded-md border-0 bg-transparent px-1 py-0.5 text-[15px] font-semibold leading-5 tracking-tight text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            :class="isComplete ? 'line-through text-muted-foreground' : ''"
            :disabled="saving.title"
            @blur="saveTitle"
            @keyup.enter="saveTitle"
          />
          <Loader2Icon
            v-if="saving.title"
            class="size-3.5 shrink-0 animate-spin text-muted-foreground"
          />
        </div>
        <div class="ml-8 mt-1.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <p class="truncate text-[12px] text-muted-foreground">
            in
            <span class="font-medium text-foreground/80">{{ columnName }}</span>
          </p>
          <span
            class="inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset"
            :class="statusChip(task.status)"
          >
            {{ statusLabel(task.status) }}
          </span>
          <span class="text-[12px] text-muted-foreground/40">·</span>
          <p
            class="truncate text-[12px] text-muted-foreground"
            :title="createdAtLabel?.exact"
          >
            {{ creatorName }}
            <template v-if="createdAtLabel">
              · {{ createdAtLabel.relative }}
            </template>
          </p>
        </div>
      </div>

      <Tabs
        :model-value="activeTab"
        class="flex min-h-0 flex-1 flex-col"
        @update:model-value="activeTab = $event as TaskTab"
      >
        <div class="shrink-0 px-5 pt-3">
          <TabsList
            class="grid h-8 w-full grid-cols-6 gap-0.5 p-0.5"
          >
            <TabsTrigger
              v-for="tab in TABS"
              :key="tab.id"
              :value="tab.id"
              class="h-7 w-full min-w-0 px-1"
            >
              <component :is="tab.icon" class="h-3.5 w-3.5" />
              {{ tab.label }}
            </TabsTrigger>
          </TabsList>
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <div v-if="activeTab === 'details'" class="space-y-4">
          <div class="grid gap-3 sm:grid-cols-3">
            <div class="space-y-1.5">
              <div class="flex items-center justify-between gap-2">
                <h3 class="text-[12px] font-medium text-muted-foreground">
                  Status
                </h3>
                <Loader2Icon
                  v-if="saving.status"
                  class="size-3 animate-spin text-muted-foreground"
                />
              </div>
              <StatusSelect
                :model-value="task.status"
                :disabled="saving.status"
                @update:model-value="setStatus"
              />
            </div>
            <div class="space-y-1.5">
              <div class="flex items-center justify-between gap-2">
                <h3 class="text-[12px] font-medium text-muted-foreground">
                  Priority
                </h3>
                <Loader2Icon
                  v-if="saving.priority"
                  class="size-3 animate-spin text-muted-foreground"
                />
              </div>
              <PrioritySelect
                :model-value="task.priority"
                :disabled="saving.priority"
                @update:model-value="setPriority"
              />
            </div>
            <div class="space-y-1.5">
              <div class="flex items-center justify-between gap-2">
                <h3 class="text-[12px] font-medium text-muted-foreground">
                  Due date
                </h3>
                <p
                  v-if="saving.due"
                  class="inline-flex items-center gap-1 text-[11px] text-muted-foreground"
                >
                  <Loader2Icon class="size-3 animate-spin" />
                  Saving
                </p>
                <p
                  v-else-if="dateSaved"
                  class="text-[11px] font-medium text-foreground"
                >
                  Saved
                </p>
              </div>
              <DatePicker v-model="dueDraft" placeholder="No due date" />
            </div>
          </div>

          <div v-if="sprintStore.sprints.length" class="space-y-1.5">
            <div class="flex items-center justify-between gap-2">
              <h3 class="text-[12px] font-medium text-muted-foreground">
                Sprint
              </h3>
              <Loader2Icon
                v-if="saving.sprint"
                class="size-3 animate-spin text-muted-foreground"
              />
            </div>
            <Select
              :model-value="task.sprintId || 'backlog'"
              :disabled="saving.sprint"
              :modal="false"
              @update:model-value="setSprint"
            >
              <SelectTrigger class="w-full max-w-xs">
                <SelectValue placeholder="Backlog" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Sprint</SelectLabel>
                  <SelectItem value="backlog">Backlog</SelectItem>
                  <SelectItem
                    v-if="assignedClosedSprint"
                    :value="assignedClosedSprint.id"
                    disabled
                  >
                    {{ assignedClosedSprint.name }} (completed)
                  </SelectItem>
                  <SelectItem
                    v-for="sprint in sprintOptions"
                    :key="sprint.id"
                    :value="sprint.id"
                  >
                    {{ sprint.name }}
                    {{ sprint.status === "ACTIVE" ? "(current)" : "" }}
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <p
              v-if="task.sprintId && !sprintOptions.some((sprint) => sprint.id === task.sprintId)"
              class="text-[12px] text-muted-foreground"
            >
              This card is on a completed sprint. Move it to the backlog or the
              current sprint to keep working on it.
            </p>
          </div>

          <div v-if="task.members?.length">
            <p class="mb-1.5 text-[12px] font-medium text-muted-foreground">
              Members
            </p>
            <div class="flex -space-x-1">
              <div
                v-for="member in task.members"
                :key="member.id"
                class="flex size-7 items-center justify-center overflow-hidden rounded-full bg-muted text-[10px] font-medium text-foreground ring-2 ring-background"
                :title="member.name || member.email"
              >
                <img
                  v-if="member.imageUrl"
                  :src="member.imageUrl"
                  class="h-full w-full object-cover"
                />
                <span v-else>{{ initials(member) }}</span>
              </div>
            </div>
          </div>

          <div
            v-if="task.aiPlanGoal"
            class="rounded-lg border border-border bg-muted/50 px-3 py-2.5"
          >
            <p class="flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground">
              <SparklesIcon class="size-3.5" />
              Created from an AI plan
            </p>
            <p class="mt-1.5 whitespace-pre-line text-[13px] text-foreground">
              {{ task.aiPlanGoal }}
            </p>
          </div>

          <div>
            <div class="mb-1.5 flex items-center justify-between gap-2">
              <h3 class="text-[12px] font-medium text-muted-foreground">
                Description
              </h3>
              <Loader2Icon
                v-if="saving.description"
                class="size-3 animate-spin text-muted-foreground"
              />
            </div>
            <textarea
              v-model="descriptionDraft"
              rows="5"
              placeholder="Add a more detailed description…"
              class="w-full rounded-lg border border-transparent bg-muted px-2.5 py-2 text-[13px] text-foreground placeholder:text-muted-foreground focus:border-ring focus:bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              :disabled="saving.description"
              @blur="saveDescription"
            />
          </div>

          <div class="space-y-2.5">
            <div class="flex items-center justify-between gap-2">
              <h3 class="text-[12px] font-medium text-muted-foreground">
                Labels
              </h3>
              <Loader2Icon
                v-if="saving.labels || creatingLabel"
                class="size-3 animate-spin text-muted-foreground"
              />
            </div>
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="label in boardStore.projectLabels"
                :key="label.id"
                type="button"
                class="inline-flex h-6 max-w-full items-center gap-1 rounded px-2 text-[12px] font-medium text-white disabled:opacity-60"
                :style="{ backgroundColor: label.color }"
                :disabled="saving.labels"
                @click="toggleLabel(label)"
              >
                <span class="truncate">{{ label.name }}</span>
                <CheckIcon
                  v-if="hasLabel(label.id)"
                  class="h-3 w-3 shrink-0"
                />
              </button>
              <p
                v-if="!boardStore.projectLabels.length"
                class="py-1 text-[12px] text-muted-foreground"
              >
                No labels yet. Create one below.
              </p>
            </div>
            <div class="space-y-3 rounded-lg border border-border p-3">
              <p class="text-[12px] font-medium text-muted-foreground">
                Create a label
              </p>
              <input
                v-model="newLabelName"
                maxlength="32"
                placeholder="Label name"
                class="h-8 w-full rounded-lg border border-border px-2.5 text-[12px] focus:outline-none focus:ring-2 focus:ring-ring"
                @keyup.enter="createLabel"
              />
              <div class="flex flex-wrap gap-1.5">
                <button
                  v-for="color in TASK_COLORS"
                  :key="color.id"
                  type="button"
                  class="h-6 w-6 rounded-full ring-offset-2"
                  :class="newLabelColor === color.value ? 'ring-2 ring-foreground' : ''"
                  :style="{ backgroundColor: color.value }"
                  :title="color.name"
                  @click="newLabelColor = color.value"
                />
              </div>
              <p v-if="labelError" class="text-[12px] text-red-600">{{ labelError }}</p>
              <Button
                :disabled="!newLabelName.trim() || creatingLabel"
                @click="createLabel"
              >
                <Loader2Icon v-if="creatingLabel" class="animate-spin" />
                <PlusIcon v-else />
                {{ creatingLabel ? "Creating…" : "Create label" }}
              </Button>
            </div>
          </div>
        </div>

        <TaskSummary v-else-if="activeTab === 'summary'" :task="task" />

        <div v-else-if="activeTab === 'members'" class="space-y-2">
          <div class="mb-3 flex items-center justify-between gap-2">
            <p class="text-[12px] text-muted-foreground">
              Add or remove people on this card. People come from the project member list.
            </p>
            <Loader2Icon
              v-if="saving.members"
              class="size-3 shrink-0 animate-spin text-muted-foreground"
            />
          </div>
          <button
            v-for="person in assignableMembers"
            :key="person.id"
            type="button"
            class="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-[13px] hover:bg-accent disabled:opacity-60"
            :disabled="saving.members"
            @click="toggleMember(person)"
          >
            <div
              class="flex size-7 items-center justify-center overflow-hidden rounded-full bg-muted text-[10px] font-medium text-foreground"
            >
              <img v-if="person.imageUrl" :src="person.imageUrl" class="h-full w-full object-cover" />
              <span v-else>{{ initials(person) }}</span>
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate font-medium text-foreground">
                {{ person.name || person.email }}
              </p>
              <p class="truncate text-xs text-muted-foreground">{{ person.email }}</p>
            </div>
            <span
              v-if="isMember(person.id)"
              class="text-[12px] font-medium text-red-600"
            >
              Remove
            </span>
            <span v-else class="text-[12px] font-medium text-foreground">Add</span>
          </button>
          <p v-if="!assignableMembers.length" class="py-6 text-center text-[12px] text-muted-foreground">
            No project members yet. Add people to the project first.
          </p>
        </div>

        <div v-else-if="activeTab === 'files'">
          <ClientOnly>
            <TaskAttachments />
            <template #fallback>
              <p class="text-[12px] text-muted-foreground">Loading files…</p>
            </template>
          </ClientOnly>
        </div>

        <div v-else-if="activeTab === 'comments'" class="flex flex-col">
          <p class="text-[12px] text-muted-foreground">
            {{ comments.length }}
            {{ comments.length === 1 ? "comment" : "comments" }}
          </p>

          <div class="mt-3">
            <textarea
              v-model="commentDraft"
              placeholder="Write a comment…"
              rows="3"
              class="min-h-[72px] w-full resize-none rounded-lg border-0 bg-muted px-2.5 py-2 text-[13px] text-foreground outline-none placeholder:text-muted-foreground focus:outline-none focus:ring-0"
              @keydown.enter.exact.prevent="submitComment"
            />
            <div class="mt-2 flex justify-end">
              <Button
                type="button"
                :disabled="savingComment"
                @click="submitComment"
              >
                <Loader2Icon v-if="savingComment" class="animate-spin" />
                {{ savingComment ? "Saving…" : "Comment" }}
              </Button>
            </div>
          </div>

          <div v-if="comments.length" class="mt-3">
            <article
              v-for="(comment, index) in comments"
              :key="comment.id"
              class="flex gap-2.5 py-3"
              :class="index ? 'border-t border-border' : ''"
            >
              <div
                class="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-[10px] font-medium text-foreground"
              >
                <img
                  v-if="comment.user.imageUrl"
                  :src="comment.user.imageUrl"
                  :alt="comment.user.name || comment.user.email"
                  class="h-full w-full object-cover"
                />
                <span v-else>{{ initials(comment.user) }}</span>
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex items-baseline justify-between gap-3">
                  <p class="truncate text-[13px] font-medium text-foreground">
                    {{ comment.user.name || comment.user.email }}
                  </p>
                  <time
                    class="shrink-0 text-[11px] text-muted-foreground"
                    :title="commentWhen(comment.createdAt).exact"
                  >
                    {{ commentWhen(comment.createdAt).relative }}
                  </time>
                </div>
                <p
                  class="mt-1 whitespace-pre-wrap break-words text-[13px] leading-5 text-foreground/90"
                >
                  {{ comment.content }}
                </p>
              </div>
            </article>
          </div>
          <div
            v-else
            class="mt-8 flex flex-col items-center justify-center py-8 text-center"
          >
            <div
              class="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground"
            >
              <MessageSquareIcon class="h-4 w-4" />
            </div>
            <p class="mt-3 text-[13px] font-medium text-foreground">No comments yet</p>
            <p class="mt-1 max-w-xs text-[12px] text-muted-foreground">
              Leave a note for the team. Comments stay on this card.
            </p>
          </div>
        </div>

        <div v-else-if="activeTab === 'activity'">
          <div class="mb-3 flex items-start justify-between gap-3">
            <p class="text-[12px] text-muted-foreground">
              Every change on this card, newest first.
            </p>
            <Button
              type="button"
              variant="outline"
              class="shrink-0"
              :disabled="!task"
              @click="openCardTimeline"
            >
              <HistoryIcon />
              Timeline
            </Button>
          </div>
          <ActivityTimeline :activities="cardTimeline" compact :selectable="false" />
        </div>
        </div>
      </Tabs>

      <DialogFooter
        v-if="canArchive"
        class="shrink-0 border-t border-border px-5 py-2.5 sm:justify-end"
      >
        <Button
          variant="outline"
          class="border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
          @click="archiveCard"
        >
          <ArchiveIcon />
          Archive card
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
