<script setup lang="ts">
import {
  ArrowRightIcon,
  HistoryIcon,
  ListChecksIcon,
  Loader2Icon,
  LockIcon,
  SparklesIcon,
} from "lucide-vue-next";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { toast } from "vue-sonner";
import type { Task, TaskSummary } from "@/types";
import { isSummaryLimitedToday, summaryBullets } from "~/utils/ai-summary";
import { statusLabel } from "@/utils/task-status";
import { Button } from "@/components/ui/button";

const props = defineProps<{
  task: Task;
}>();

const boardStore = useBoardStore();
const userStore = useUserStore();
const workspaceStore = useWorkspaceStore();
const generating = ref(false);
const locked = computed(
  () => !boardStore.selectedTaskLoading && !boardStore.canGenerateSummary,
);

const summaries = computed(() => {
  if (props.task.summaries?.length) return props.task.summaries;
  return props.task.summary ? [props.task.summary] : [];
});

const summary = computed(() => summaries.value[0] ?? null);
const earlierSummaries = computed(() => summaries.value.slice(1));
const progressBullets = computed(() => summaryBullets(summary.value?.progress));
const actionBullets = computed(() => summaryBullets(summary.value?.furtherAction));
const limitedToday = computed(() =>
  isSummaryLimitedToday(summary.value?.generatedAt, userStore.user?.email),
);

const formatGenerated = (value: Date | string | null | undefined) => {
  if (!value) return null;
  const date = typeof value === "string" ? parseISO(value) : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return {
    relative: formatDistanceToNow(date, { addSuffix: true }),
    exact: format(date, "MMM d, yyyy · h:mm a"),
  };
};

const generatedLabel = computed(() => formatGenerated(summary.value?.generatedAt));

const latestActivity = computed(() => {
  const items = props.task.activities ?? [];
  if (!items.length) return null;
  return [...items].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )[0];
});

const contextItems = computed(() => {
  const comments = props.task.comments?.length ?? props.task.commentCount;
  const members = props.task.members?.length ?? 0;
  const items = [
    statusLabel(props.task.status),
    members === 1 ? "1 member" : `${members} members`,
    comments === 1 ? "1 comment" : `${comments} comments`,
  ];
  if (latestActivity.value) {
    items.push(latestActivity.value.message);
  }
  return items;
});

const generateSummary = async () => {
  if (generating.value || limitedToday.value || locked.value) return;
  generating.value = true;
  try {
    const result = await boardStore.generateTaskSummary(props.task.id);
    if (result && result.created === false) {
      toast.message("A summary can only be generated once a day", {
        description: "Come back tomorrow to refresh this briefing.",
      });
    }
  } catch (error: any) {
    toast.error("Could not generate a summary", {
      description: error?.data?.message || "Please try again.",
    });
  } finally {
    generating.value = false;
  }
};

const earlierLabel = (item: TaskSummary) => {
  const label = formatGenerated(item.generatedAt);
  return label?.exact || label?.relative || "Earlier briefing";
};
</script>

<template>
  <div class="space-y-5">
    <section
      v-if="locked"
      class="flex flex-col items-start gap-3 rounded-xl border border-primary/20 bg-primary/[0.04] p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div class="flex items-start gap-3">
        <div
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"
        >
          <LockIcon class="h-4 w-4" />
        </div>
        <div>
          <p class="text-sm font-medium text-foreground">
            AI summaries are on Team and Business
          </p>
          <p class="mt-0.5 text-sm text-muted-foreground">
            Get a daily briefing of progress and next steps for every card.
          </p>
        </div>
      </div>
      <Button
        v-if="workspaceStore.activeWorkspaceId"
        as-child
        size="sm"
        class="h-8 shrink-0"
      >
        <NuxtLink
          :to="{
            name: 'workspace-billing',
            params: { workspaceId: workspaceStore.activeWorkspaceId },
          }"
        >
          Upgrade
        </NuxtLink>
      </Button>
    </section>

    <div v-else class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <p class="text-sm text-muted-foreground">
          One new briefing per card per day. Earlier briefings stay on the
          card so you can track how the work has moved.
        </p>
        <p
          v-if="generatedLabel"
          class="mt-1 text-xs text-muted-foreground"
          :title="generatedLabel.exact"
        >
          Latest {{ generatedLabel.relative }}
          <template v-if="limitedToday"> · next refresh tomorrow</template>
        </p>
      </div>
      <Button
        type="button"
        size="sm"
        class="h-8 shrink-0"
        :variant="summary ? 'outline' : 'default'"
        :disabled="generating || limitedToday"
        @click="generateSummary"
      >
        <Loader2Icon v-if="generating" class="h-3.5 w-3.5 animate-spin" />
        <SparklesIcon v-else class="h-3.5 w-3.5" />
        {{
          generating
            ? "Generating…"
            : limitedToday
              ? "Generated today"
              : summary
                ? "Generate new"
                : "Generate summary"
        }}
      </Button>
    </div>

    <section class="rounded-xl border border-border bg-card p-4">
      <div class="flex items-center gap-2">
        <div
          class="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary"
        >
          <ListChecksIcon class="h-3.5 w-3.5" />
        </div>
        <h3 class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Progress
        </h3>
      </div>
      <ul
        v-if="progressBullets.length"
        class="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-6 text-foreground marker:text-primary/70"
      >
        <li v-for="(item, index) in progressBullets" :key="index">
          {{ item }}
        </li>
      </ul>
      <p v-else class="mt-3 text-sm leading-6 text-muted-foreground">
        Generate a briefing from the description, comments, files, and activity
        so the team can see where this card stands.
      </p>
    </section>

    <section class="rounded-xl border border-border bg-card p-4">
      <div class="flex items-center gap-2">
        <div
          class="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary"
        >
          <ArrowRightIcon class="h-3.5 w-3.5" />
        </div>
        <h3 class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Further action
        </h3>
      </div>
      <ol
        v-if="actionBullets.length"
        class="mt-3 list-decimal space-y-1.5 pl-5 text-sm leading-6 text-foreground marker:font-semibold marker:text-primary"
      >
        <li v-for="(item, index) in actionBullets" :key="index">
          {{ item }}
        </li>
      </ol>
      <p v-else class="mt-3 text-sm leading-6 text-muted-foreground">
        Generate concrete next steps, including who should take them when that
        is clear.
      </p>
    </section>

    <section
      v-if="earlierSummaries.length"
      class="space-y-3 rounded-xl border border-border bg-muted/40 p-4"
    >
      <div class="flex items-center gap-2">
        <HistoryIcon class="h-3.5 w-3.5 text-primary" />
        <h3 class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Earlier briefings
        </h3>
      </div>
      <article
        v-for="item in earlierSummaries"
        :key="item.id || earlierLabel(item)"
        class="rounded-lg border border-border bg-card p-3"
      >
        <p class="text-[11px] font-medium text-muted-foreground">
          {{ earlierLabel(item) }}
        </p>
        <ul
          class="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-foreground marker:text-primary/70"
        >
          <li v-for="(line, index) in summaryBullets(item.progress)" :key="`p-${index}`">
            {{ line }}
          </li>
        </ul>
        <p class="mt-2 text-[11px] font-medium text-muted-foreground">Next</p>
        <ol
          class="mt-1 list-decimal space-y-1 pl-5 text-sm leading-6 text-muted-foreground"
        >
          <li v-for="(line, index) in summaryBullets(item.furtherAction)" :key="`a-${index}`">
            {{ line }}
          </li>
        </ol>
      </article>
    </section>

    <p class="text-xs leading-5 text-muted-foreground">
      Uses
      <template v-for="(item, index) in contextItems" :key="item">
        <span v-if="index"> · </span>
        <span>{{ item }}</span>
      </template>
    </p>
  </div>
</template>
