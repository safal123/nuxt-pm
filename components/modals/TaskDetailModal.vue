<script setup lang="ts">
import {
  AlignLeftIcon,
  CheckIcon,
  ArchiveIcon,
  HistoryIcon,
  MessageSquareIcon,
  PaletteIcon,
  PaperclipIcon,
  PlusIcon,
  UserIcon,
} from "lucide-vue-next";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { toast } from "vue-sonner";
import type { TaskAssignee, TaskLabel, TaskPriority, TaskStatus } from "@/types";
import { statusChip, statusLabel } from "@/utils/task-status";

type TaskTab = "details" | "style" | "members" | "files" | "comments" | "activity";

const TABS: { id: TaskTab; label: string; icon: typeof UserIcon }[] = [
  { id: "details", label: "Details", icon: AlignLeftIcon },
  { id: "style", label: "Style", icon: PaletteIcon },
  { id: "members", label: "Members", icon: UserIcon },
  { id: "files", label: "Files", icon: PaperclipIcon },
  { id: "comments", label: "Comments", icon: MessageSquareIcon },
  { id: "activity", label: "Activity", icon: HistoryIcon },
];

const boardStore = useBoardStore();
const userStore = useUserStore();
const workspaceStore = useWorkspaceStore();

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
    titleDraft.value = task.value.title;
    descriptionDraft.value = task.value.description ?? "";
    dueDraft.value = toInputDate(task.value.dueDate);
    activeTab.value = "details";
    commentDraft.value = "";
    labelError.value = "";
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

const saveDueDate = async () => {
  if (!task.value) return;
  savingDates.value = true;
  try {
    await boardStore.patchTask(task.value.id, {
      dueDate: dueDraft.value ? new Date(`${dueDraft.value}T12:00:00`).toISOString() : null,
    });
  } finally {
    savingDates.value = false;
  }
};

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

const setCover = async (colorId: string | null) => {
  if (!task.value) return;
  const next = task.value.coverColor === colorId ? null : colorId;
  await boardStore.patchTask(task.value.id, { coverColor: next });
};

const setPriority = async (priority: TaskPriority) => {
  if (!task.value || task.value.priority === priority) return;
  await boardStore.patchTask(task.value.id, { priority });
};

const setStatus = async (status: TaskStatus) => {
  if (!task.value || task.value.status === status) return;
  await boardStore.patchTask(task.value.id, { status });
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
      class="max-w-2xl w-full h-[min(720px,90vh)] p-0 gap-0 overflow-hidden flex flex-col"
      @pointer-down-outside="ignoreSelectOutside"
      @focus-outside="ignoreSelectOutside"
      @interact-outside="ignoreSelectOutside"
    >
      <div
        v-if="task.coverColor"
        class="h-24 w-full shrink-0"
        :style="{ backgroundColor: colorValue(task.coverColor) }"
      />

      <div class="shrink-0 px-6 pt-4 pr-12">
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="h-6 w-6 shrink-0 inline-flex items-center justify-center rounded-full border transition"
            :class="
              isComplete
                ? 'border-emerald-500 bg-emerald-500 text-white'
                : 'border-muted-foreground/40 text-transparent hover:border-emerald-500 hover:text-emerald-500'
            "
            :aria-label="isComplete ? 'Reopen card' : 'Mark as complete'"
            :title="isComplete ? 'Reopen' : 'Mark as complete'"
            @click="toggleComplete"
          >
            <CheckIcon class="h-3.5 w-3.5" />
          </button>
          <input
            v-model="titleDraft"
            class="min-w-0 flex-1 text-lg font-semibold leading-6 text-foreground bg-transparent border-0 rounded-md px-1 py-0.5 -ml-0.5 focus:outline-none focus:ring-2 focus:ring-violet-400"
            :class="isComplete ? 'line-through text-muted-foreground' : ''"
            @blur="saveTitle"
            @keyup.enter="saveTitle"
          />
        </div>
        <div class="mt-1.5 ml-8 flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
          <p class="text-xs text-muted-foreground truncate">
            in list <span class="underline decoration-border">{{ columnName }}</span>
          </p>
          <span
            class="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset shrink-0"
            :class="statusChip(task.status)"
          >
            {{ statusLabel(task.status) }}
          </span>
          <span class="text-muted-foreground/50 text-xs">·</span>
          <p
            class="text-xs text-muted-foreground truncate"
            :title="createdAtLabel?.exact"
          >
            Created by
            <span class="font-medium text-foreground/80">{{ creatorName }}</span>
            <template v-if="createdAtLabel">
              · {{ createdAtLabel.relative }}
            </template>
          </p>
        </div>
      </div>

      <div class="shrink-0 mt-3 px-6 border-b border-border">
        <nav class="-mb-px flex gap-1 overflow-x-auto" aria-label="Card sections">
          <button
            v-for="tab in TABS"
            :key="tab.id"
            type="button"
            class="inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors"
            :class="
              activeTab === tab.id
                ? 'border-violet-600 text-violet-700'
                : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
            "
            @click="activeTab = tab.id"
          >
            <component :is="tab.icon" class="h-4 w-4" />
            {{ tab.label }}
          </button>
        </nav>
      </div>

      <div class="flex-1 min-h-0 overflow-y-auto px-6 py-5">
        <section v-if="activeTab === 'details'" class="space-y-5">
          <div>
            <h3 class="text-sm font-semibold text-foreground mb-1">Status</h3>
            <p class="text-sm text-muted-foreground mb-3">
              Track where this card is. Marking it complete sets the status to Done.
            </p>
            <StatusSelect
              :model-value="task.status"
              @update:model-value="setStatus"
            />
          </div>

          <div v-if="task.members?.length">
            <p class="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
              Members
            </p>
            <div class="flex -space-x-1">
              <div
                v-for="member in task.members"
                :key="member.id"
                class="h-8 w-8 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300 text-[11px] font-semibold overflow-hidden ring-2 ring-background flex items-center justify-center"
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

          <div class="space-y-3">
            <div>
              <h3 class="text-sm font-semibold text-foreground">Due date</h3>
              <p class="text-sm text-muted-foreground">Optional. Cards with a due date show it on the board.</p>
            </div>
            <DatePicker v-model="dueDraft" />
            <div class="flex items-center gap-2">
              <Button size="sm" :disabled="savingDates" @click="saveDueDate">Save</Button>
              <button
                type="button"
                class="text-sm text-muted-foreground hover:text-foreground"
                @click="dueDraft = ''"
              >
                Clear
              </button>
            </div>
          </div>

          <div>
            <h3 class="text-sm font-semibold text-foreground mb-2">Description</h3>
            <textarea
              v-model="descriptionDraft"
              rows="5"
              placeholder="Add a more detailed description…"
              class="w-full rounded-lg border border-transparent bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:bg-background focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-400"
              @blur="saveDescription"
            />
          </div>
        </section>

        <section v-else-if="activeTab === 'style'" class="space-y-6">
          <div>
            <h3 class="text-sm font-semibold text-foreground mb-1">Priority</h3>
            <p class="text-sm text-muted-foreground mb-3">Choose how important this card is.</p>
            <PrioritySelect
              :model-value="task.priority"
              @update:model-value="setPriority"
            />
          </div>

          <div>
            <h3 class="text-sm font-semibold text-foreground mb-1">Cover</h3>
            <p class="text-sm text-muted-foreground mb-3">Pick a color for the top of this card.</p>
            <div class="grid grid-cols-5 gap-2">
              <button
                v-for="color in TASK_COLORS"
                :key="color.id"
                type="button"
                class="h-10 rounded-md ring-offset-2"
                :class="task.coverColor === color.id ? 'ring-2 ring-foreground' : 'hover:opacity-90'"
                :style="{ backgroundColor: color.value }"
                :title="color.name"
                @click="setCover(color.id)"
              />
            </div>
            <button
              type="button"
              class="mt-3 text-sm text-muted-foreground hover:text-foreground"
              @click="setCover(null)"
            >
              Remove cover
            </button>
          </div>

          <div class="space-y-3">
            <div>
              <h3 class="text-sm font-semibold text-foreground mb-1">Labels</h3>
              <p class="text-sm text-muted-foreground">
                Labels are optional. Create your own, then add them to this card.
              </p>
            </div>

            <div class="rounded-lg border border-border p-3 space-y-3">
              <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Create a label</p>
              <input
                v-model="newLabelName"
                maxlength="32"
                placeholder="Label name"
                class="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
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

            <div class="space-y-1.5">
              <button
                v-for="label in boardStore.projectLabels"
                :key="label.id"
                type="button"
                class="w-full h-9 rounded-md text-sm font-semibold text-white relative px-3 text-left"
                :style="{ backgroundColor: label.color }"
                @click="toggleLabel(label)"
              >
                {{ label.name }}
                <CheckIcon
                  v-if="hasLabel(label.id)"
                  class="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2"
                />
              </button>
              <p
                v-if="!boardStore.projectLabels.length"
                class="text-sm text-muted-foreground py-4 text-center"
              >
                No labels yet. Create one above.
              </p>
            </div>
          </div>
        </section>

        <section v-else-if="activeTab === 'members'" class="space-y-2">
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
              class="h-8 w-8 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300 text-[11px] font-semibold overflow-hidden flex items-center justify-center"
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
            <span v-else class="text-xs font-medium text-violet-600">Add</span>
          </button>
          <p v-if="!assignableMembers.length" class="text-sm text-muted-foreground py-6 text-center">
            No project members yet. Add people to the project first.
          </p>
        </section>

        <section v-else-if="activeTab === 'files'">
          <ClientOnly>
            <TaskAttachments />
            <template #fallback>
              <p class="text-sm text-muted-foreground">Loading files…</p>
            </template>
          </ClientOnly>
        </section>

        <section v-else-if="activeTab === 'comments'" class="flex min-h-full flex-col">
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
                class="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-violet-100 text-[11px] font-semibold text-violet-700 flex items-center justify-center dark:bg-violet-500/20 dark:text-violet-300"
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
            class="mt-8 flex flex-1 flex-col items-center justify-center py-8 text-center"
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

          <div class="mt-auto pt-4">
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
        </section>

        <section v-else-if="activeTab === 'activity'">
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
        </section>
      </div>

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
