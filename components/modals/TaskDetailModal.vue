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
  UserIcon,
  XIcon,
} from "lucide-vue-next";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { toast } from "vue-sonner";
import type { TaskAssignee, TaskLabel, TaskPriority, TaskStatus } from "@/types";
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

type TaskTab = "details" | "members" | "files" | "comments" | "activity";

const TABS: { id: TaskTab; label: string; icon: typeof UserIcon }[] = [
  { id: "details", label: "Details", icon: AlignLeftIcon },
  { id: "members", label: "Members", icon: UserIcon },
  { id: "files", label: "Files", icon: PaperclipIcon },
  { id: "comments", label: "Comments", icon: MessageSquareIcon },
  { id: "activity", label: "Activity", icon: HistoryIcon },
];

const boardStore = useBoardStore();
const userStore = useUserStore();
const workspaceStore = useWorkspaceStore();
const sprintStore = useSprintStore();

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
const savingDates = ref(false);
const dateSaved = ref(false);
const dueReady = ref(false);
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
  await boardStore.patchTask(task.value.id, { title: next });
};

const saveDescription = async () => {
  if (!task.value) return;
  const next = descriptionDraft.value.trim() || null;
  if (next === (task.value.description ?? null)) return;
  await boardStore.patchTask(task.value.id, { description: next });
};

const saveDueDate = async (value: string) => {
  if (!task.value || !dueReady.value) return;
  if (value === toInputDate(task.value.dueDate)) return;
  savingDates.value = true;
  dateSaved.value = false;
  try {
    await boardStore.patchTask(task.value.id, {
      dueDate: value ? new Date(`${value}T12:00:00`).toISOString() : null,
    });
    dateSaved.value = true;
  } finally {
    savingDates.value = false;
  }
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
  await boardStore.patchTask(task.value.id, { labelIds });
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
  await boardStore.patchTask(task.value.id, { memberIds });
};


const setPriority = async (priority: TaskPriority) => {
  if (!task.value || task.value.priority === priority) return;
  await boardStore.patchTask(task.value.id, { priority });
};

const setStatus = async (status: TaskStatus) => {
  if (!task.value || task.value.status === status) return;
  await boardStore.patchTask(task.value.id, { status });
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
  await boardStore.patchTask(task.value.id, { sprintId });
};

const toggleComplete = async () => {
  if (!task.value) return;
  await boardStore.patchTask(task.value.id, {
    completed: task.value.status !== "DONE",
  });
};

const isComplete = computed(() => task.value?.status === "DONE");

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
const activityFeed = computed(() => task.value?.activities ?? []);

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
      class="flex max-h-[min(720px,90vh)] w-full max-w-2xl flex-col overflow-hidden p-0 gap-0 [&>button]:hidden"
      @pointer-down-outside="ignoreSelectOutside"
      @focus-outside="ignoreSelectOutside"
      @interact-outside="ignoreSelectOutside"
    >
      <div class="absolute right-3 top-3 z-20 flex items-center gap-0.5">
        <TaskCoverPicker
          :task="task"
          :overlay="Boolean(task.coverImage || task.coverColor)"
        />
        <DialogClose
          class="inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors"
          :class="
            task.coverImage || task.coverColor
              ? 'bg-black/40 text-white hover:bg-black/55'
              : 'text-muted-foreground opacity-70 hover:bg-accent hover:text-foreground hover:opacity-100'
          "
        >
          <XIcon class="h-4 w-4" />
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
        class="shrink-0 px-6 pt-5"
        :class="task.coverImage || task.coverColor ? '' : 'pr-20'"
      >
        <div class="flex items-center gap-2.5">
          <button
            type="button"
            class="h-6 w-6 shrink-0 inline-flex items-center justify-center rounded-full border transition-colors"
            :class="
              isComplete
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-muted-foreground/35 text-transparent hover:border-primary hover:text-primary'
            "
            :aria-label="isComplete ? 'Reopen card' : 'Mark as complete'"
            :title="isComplete ? 'Reopen' : 'Mark as complete'"
            @click="toggleComplete"
          >
            <CheckIcon class="h-3.5 w-3.5" />
          </button>
          <input
            v-model="titleDraft"
            class="min-w-0 flex-1 bg-transparent px-1 py-0.5 -ml-0.5 text-lg font-semibold leading-6 text-foreground rounded-md border-0 focus:outline-none focus:ring-2 focus:ring-ring"
            :class="isComplete ? 'line-through text-muted-foreground' : ''"
            @blur="saveTitle"
            @keyup.enter="saveTitle"
          />
        </div>
        <div class="mt-1.5 ml-8 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <p class="truncate text-xs text-muted-foreground">
            in
            <span class="font-medium text-foreground/80">{{ columnName }}</span>
          </p>
          <span
            class="inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset"
            :class="statusChip(task.status)"
          >
            {{ statusLabel(task.status) }}
          </span>
          <span class="text-xs text-muted-foreground/40">·</span>
          <p
            class="truncate text-xs text-muted-foreground"
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
        <div class="shrink-0 px-6 pt-4">
          <TabsList
            class="h-auto w-full justify-start gap-0.5 overflow-x-auto rounded-lg bg-muted p-1"
          >
            <TabsTrigger
              v-for="tab in TABS"
              :key="tab.id"
              :value="tab.id"
              class="h-8 gap-1.5 rounded-md px-2.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none"
            >
              <component :is="tab.icon" class="h-3.5 w-3.5" />
              {{ tab.label }}
            </TabsTrigger>
          </TabsList>
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        <div v-if="activeTab === 'details'" class="space-y-6">
          <div class="grid gap-4 sm:grid-cols-3">
            <div class="space-y-2">
              <h3 class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Status
              </h3>
              <StatusSelect
                :model-value="task.status"
                @update:model-value="setStatus"
              />
            </div>
            <div class="space-y-2">
              <h3 class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Priority
              </h3>
              <PrioritySelect
                :model-value="task.priority"
                @update:model-value="setPriority"
              />
            </div>
            <div class="space-y-2">
              <div class="flex items-center justify-between gap-2">
                <h3 class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Due date
                </h3>
                <p
                  v-if="savingDates"
                  class="inline-flex items-center gap-1 text-[11px] text-muted-foreground"
                >
                  <Loader2Icon class="h-3 w-3 animate-spin" />
                  Saving
                </p>
                <p
                  v-else-if="dateSaved"
                  class="text-[11px] font-medium text-primary"
                >
                  Saved
                </p>
              </div>
              <DatePicker v-model="dueDraft" placeholder="No due date" />
            </div>
          </div>

          <div v-if="sprintStore.sprints.length" class="space-y-2">
            <h3 class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Sprint
            </h3>
            <Select
              :model-value="task.sprintId || 'backlog'"
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
              class="text-xs text-muted-foreground"
            >
              This card is on a completed sprint. Move it to the backlog or the
              current sprint to keep working on it.
            </p>
          </div>

          <div v-if="task.members?.length">
            <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Members
            </p>
            <div class="flex -space-x-1">
              <div
                v-for="member in task.members"
                :key="member.id"
                class="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-[11px] font-semibold text-primary ring-2 ring-background"
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

          <div>
            <h3 class="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Description
            </h3>
            <textarea
              v-model="descriptionDraft"
              rows="5"
              placeholder="Add a more detailed description…"
              class="w-full rounded-lg border border-transparent bg-muted px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              @blur="saveDescription"
            />
          </div>

          <div class="space-y-3">
            <h3 class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Labels
            </h3>
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="label in boardStore.projectLabels"
                :key="label.id"
                type="button"
                class="inline-flex h-6 max-w-full items-center gap-1 rounded px-2 text-xs font-semibold text-white"
                :style="{ backgroundColor: label.color }"
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
                class="py-1 text-sm text-muted-foreground"
              >
                No labels yet. Create one below.
              </p>
            </div>
            <div class="space-y-3 rounded-lg border border-border p-3">
              <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Create a label
              </p>
              <input
                v-model="newLabelName"
                maxlength="32"
                placeholder="Label name"
                class="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
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
              <p v-if="labelError" class="text-xs text-red-600">{{ labelError }}</p>
              <Button
                size="sm"
                :disabled="!newLabelName.trim() || creatingLabel"
                @click="createLabel"
              >
                <PlusIcon class="h-4 w-4 mr-1" />
                Create label
              </Button>
            </div>
          </div>
        </div>

        <div v-else-if="activeTab === 'members'" class="space-y-2">
          <p class="text-sm text-muted-foreground mb-3">
            Add or remove people on this card. People come from the project member list.
          </p>
          <button
            v-for="person in assignableMembers"
            :key="person.id"
            type="button"
            class="w-full flex items-center gap-3 rounded-lg px-2 py-2 text-left text-sm hover:bg-accent"
            @click="toggleMember(person)"
          >
            <div
              class="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-[11px] font-semibold text-primary"
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
              class="text-xs font-medium text-red-600"
            >
              Remove
            </span>
            <span v-else class="text-xs font-medium text-primary">Add</span>
          </button>
          <p v-if="!assignableMembers.length" class="text-sm text-muted-foreground py-6 text-center">
            No project members yet. Add people to the project first.
          </p>
        </div>

        <div v-else-if="activeTab === 'files'">
          <ClientOnly>
            <TaskAttachments />
            <template #fallback>
              <p class="text-sm text-muted-foreground">Loading files…</p>
            </template>
          </ClientOnly>
        </div>

        <div v-else-if="activeTab === 'comments'" class="flex flex-col">
          <p class="text-sm text-muted-foreground">
            {{ comments.length }}
            {{ comments.length === 1 ? "comment" : "comments" }}
          </p>

          <div v-if="comments.length" class="mt-4">
            <article
              v-for="(comment, index) in comments"
              :key="comment.id"
              class="flex gap-3 py-4"
              :class="index ? 'border-t border-border' : ''"
            >
              <div
                class="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-[11px] font-semibold text-primary"
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
                  <p class="truncate text-sm font-medium text-foreground">
                    {{ comment.user.name || comment.user.email }}
                  </p>
                  <time
                    class="shrink-0 text-xs text-muted-foreground"
                    :title="commentWhen(comment.createdAt).exact"
                  >
                    {{ commentWhen(comment.createdAt).relative }}
                  </time>
                </div>
                <p
                  class="mt-1.5 text-sm leading-6 text-foreground/90 whitespace-pre-wrap break-words"
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
            <p class="mt-3 text-sm font-medium text-foreground">No comments yet</p>
            <p class="mt-1 max-w-xs text-sm text-muted-foreground">
              Leave a note for the team. Comments stay on this card.
            </p>
          </div>

          <div class="pt-4">
            <textarea
              v-model="commentDraft"
              placeholder="Write a comment…"
              rows="3"
              class="min-h-[88px] w-full resize-none rounded-md bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none border-0 focus:outline-none focus:ring-0"
              @keydown.enter.exact.prevent="submitComment"
            />
            <div class="mt-2 flex justify-end">
              <Button
                type="button"
                size="sm"
                :disabled="savingComment"
                @click="submitComment"
              >
                Comment
              </Button>
            </div>
          </div>
        </div>

        <div v-else-if="activeTab === 'activity'">
          <p class="text-sm text-muted-foreground mb-4">
            A log of every change made on this card.
          </p>
          <div class="space-y-4">
            <TaskActivityItem
              v-for="activity in activityFeed"
              :key="activity.id"
              :activity="activity"
            />
            <p v-if="!activityFeed.length" class="text-sm text-muted-foreground">
              No activity yet.
            </p>
          </div>
        </div>
        </div>
      </Tabs>

      <DialogFooter
        v-if="canArchive"
        class="shrink-0 border-t border-border px-6 py-3 sm:justify-end"
      >
        <Button
          variant="outline"
          size="sm"
          class="border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
          @click="archiveCard"
        >
          <ArchiveIcon class="h-4 w-4" />
          Archive card
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
