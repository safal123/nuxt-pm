<script setup lang="ts">
import { format, formatDistanceToNow, parseISO } from "date-fns";
import type { TaskAssignee, WorkspaceActivity } from "@/types";

const props = defineProps<{
  activity: WorkspaceActivity | null;
}>();

const emit = defineEmits<{
  (e: "close"): void;
}>();

const open = computed(() => !!props.activity);

const close = () => emit("close");

const onOpen = (value: boolean) => {
  if (!value) close();
};

const initials = (person: TaskAssignee) => {
  const name = person.name || person.email || "";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase() || "?";
};

const typeLabel = (type: string) =>
  type.replace(/_/g, " ").toLowerCase();

const pretty = (value: unknown) => {
  if (value == null || value === "") return null;
  if (typeof value === "boolean" || typeof value === "number") return String(value);
  if (typeof value !== "string") return null;
  if (/^[A-Z0-9_]+$/.test(value)) return value.replace(/_/g, " ").toLowerCase();
  return value;
};

const parseDate = (value: Date | string) => {
  const date = typeof value === "string" ? parseISO(value) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const when = computed(() => {
  const date = props.activity ? parseDate(props.activity.createdAt) : null;
  if (!date) return { relative: "—", exact: "—" };
  return {
    relative: formatDistanceToNow(date, { addSuffix: true }),
    exact: format(date, "EEEE, MMM d, yyyy 'at' h:mm a"),
  };
});

const changeLabel = computed(() => {
  const type = props.activity?.type;
  if (type === "TITLE_CHANGED") return "Title";
  if (type === "PRIORITY_CHANGED") return "Priority";
  if (
    type === "STATUS_CHANGED" ||
    type === "COMPLETED" ||
    type === "REOPENED"
  ) {
    return "Status";
  }
  return "Changed";
});

const fromTo = computed(() => {
  const meta = props.activity?.metadata;
  if (!meta) return null;
  const from = pretty(meta.from);
  const to = pretty(meta.to);
  if (from == null && to == null) return null;
  return { from, to };
});

const dateChanges = computed(() => {
  const raw = props.activity?.metadata?.changes;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as { field?: string; from?: string | null; to?: string | null };
      if (!row.field) return null;
      return {
        field: row.field.replace(/^./, (char) => char.toUpperCase()),
        from: row.from || null,
        to: row.to || null,
      };
    })
    .filter(Boolean) as { field: string; from: string | null; to: string | null }[];
});

const commentText = computed(() => {
  if (props.activity?.type !== "COMMENT") return null;
  const content = props.activity.metadata?.content;
  return typeof content === "string" ? content : null;
});
</script>

<template>
  <Dialog :open="open" @update:open="onOpen">
    <DialogContent
      class="max-w-md gap-0 p-0 sm:max-w-lg"
      :class="activity?.email ? 'sm:max-w-2xl' : ''"
    >
      <DialogHeader class="border-b border-border px-6 py-4">
        <DialogTitle>Activity details</DialogTitle>
        <DialogDescription>
          {{ when.relative }}
        </DialogDescription>
      </DialogHeader>

      <div v-if="activity" class="max-h-[70vh] space-y-5 overflow-y-auto px-6 py-5">
        <div class="flex items-start gap-3">
          <div
            class="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-violet-100 text-[12px] font-semibold text-violet-700 dark:bg-violet-500/20 dark:text-violet-300 flex items-center justify-center"
          >
            <img
              v-if="activity.user.imageUrl"
              :src="activity.user.imageUrl"
              class="h-full w-full object-cover"
            />
            <span v-else>{{ initials(activity.user) }}</span>
          </div>
          <div class="min-w-0">
            <p class="text-sm font-semibold text-foreground">
              {{ activity.user.name || activity.user.email }}
            </p>
            <p v-if="activity.user.email && activity.user.name" class="text-xs text-muted-foreground">
              {{ activity.user.email }}
            </p>
            <p class="mt-1 text-sm leading-5 text-muted-foreground">
              {{ activity.message }}
            </p>
          </div>
        </div>

        <dl class="overflow-hidden rounded-lg border border-border">
          <div class="grid grid-cols-[110px_1fr] gap-3 border-b border-border px-3 py-2.5 last:border-b-0">
            <dt class="text-xs font-medium text-muted-foreground">Type</dt>
            <dd>
              <span
                class="inline-flex rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium capitalize text-muted-foreground"
              >
                {{ typeLabel(activity.type) }}
              </span>
            </dd>
          </div>
          <div class="grid grid-cols-[110px_1fr] gap-3 border-b border-border px-3 py-2.5 last:border-b-0">
            <dt class="text-xs font-medium text-muted-foreground">When</dt>
            <dd class="text-sm text-foreground">{{ when.exact }}</dd>
          </div>
          <div class="grid grid-cols-[110px_1fr] gap-3 border-b border-border px-3 py-2.5 last:border-b-0">
            <dt class="text-xs font-medium text-muted-foreground">Project</dt>
            <dd class="text-sm text-foreground">{{ activity.project?.name || "Workspace" }}</dd>
          </div>
          <div v-if="activity.email" class="grid grid-cols-[110px_1fr] gap-3 border-b border-border px-3 py-2.5">
            <dt class="text-xs font-medium text-muted-foreground">To</dt>
            <dd class="truncate text-sm text-foreground">{{ activity.email.toEmail }}</dd>
          </div>
          <div v-if="activity.email" class="grid grid-cols-[110px_1fr] gap-3 border-b border-border px-3 py-2.5">
            <dt class="text-xs font-medium text-muted-foreground">Subject</dt>
            <dd class="text-sm text-foreground">{{ activity.email.subject }}</dd>
          </div>
          <div v-if="activity.email" class="grid grid-cols-[110px_1fr] gap-3 border-b border-border px-3 py-2.5">
            <dt class="text-xs font-medium text-muted-foreground">Template</dt>
            <dd class="text-sm text-foreground">{{ activity.email.templateLabel }}</dd>
          </div>
          <div v-if="activity.email" class="grid grid-cols-[110px_1fr] gap-3 px-3 py-2.5">
            <dt class="text-xs font-medium text-muted-foreground">Status</dt>
            <dd class="text-sm capitalize text-foreground">{{ activity.email.status }}</dd>
          </div>
          <div v-else class="grid grid-cols-[110px_1fr] gap-3 px-3 py-2.5">
            <dt class="text-xs font-medium text-muted-foreground">{{ activity.task ? "Task" : "Project" }}</dt>
            <dd class="text-sm text-foreground">{{ activity.task?.title || activity.project?.name || "—" }}</dd>
          </div>
        </dl>

        <div
          v-if="fromTo"
          class="overflow-hidden rounded-lg border border-border"
        >
          <p class="border-b border-border bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
            {{ changeLabel }}
          </p>
          <div class="flex items-center gap-2 px-3 py-2.5 text-sm">
            <span
              v-if="fromTo.from"
              class="min-w-0 truncate text-muted-foreground line-through"
            >
              {{ fromTo.from }}
            </span>
            <span v-else class="text-muted-foreground">—</span>
            <span class="shrink-0 text-muted-foreground">→</span>
            <span class="min-w-0 truncate font-medium text-foreground" :class="changeLabel === 'Title' ? '' : 'capitalize'">
              {{ fromTo.to || "cleared" }}
            </span>
          </div>
        </div>

        <div
          v-if="dateChanges.length"
          class="overflow-hidden rounded-lg border border-border"
        >
          <p class="border-b border-border bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
            Date changes
          </p>
          <div
            v-for="(change, index) in dateChanges"
            :key="`${change.field}-${index}`"
            class="flex items-center gap-3 px-3 py-2.5 text-sm"
            :class="index ? 'border-t border-border' : ''"
          >
            <span class="w-16 shrink-0 text-xs font-medium text-muted-foreground">
              {{ change.field }}
            </span>
            <span class="min-w-0 flex-1">
              <template v-if="change.from && change.to">
                <span class="text-muted-foreground line-through">{{ change.from }}</span>
                <span class="mx-1.5 text-muted-foreground">→</span>
                <span class="text-foreground">{{ change.to }}</span>
              </template>
              <template v-else-if="change.to">
                {{ change.to }}
              </template>
              <template v-else-if="change.from">
                <span class="text-muted-foreground line-through">{{ change.from }}</span>
                <span class="ml-1.5 text-muted-foreground">cleared</span>
              </template>
            </span>
          </div>
        </div>

        <div v-if="commentText" class="space-y-1.5">
          <p class="text-xs font-medium text-muted-foreground">Comment</p>
          <p
            class="rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm leading-6 text-foreground whitespace-pre-wrap"
          >
            {{ commentText }}
          </p>
        </div>

        <p v-if="activity.email?.error" class="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {{ activity.email.error }}
        </p>

        <div v-if="activity.email?.html" class="space-y-2">
          <p class="text-xs font-medium text-muted-foreground">Template preview</p>
          <iframe
            class="h-[360px] w-full rounded-lg border border-border bg-white"
            sandbox=""
            :srcdoc="activity.email.html"
            title="Email template preview"
          />
        </div>
      </div>

      <DialogFooter class="border-t border-border px-6 py-4">
        <Button variant="outline" @click="close">Close</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
