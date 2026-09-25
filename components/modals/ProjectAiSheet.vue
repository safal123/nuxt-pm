<script setup lang="ts">
import {
  Loader2Icon,
  LockIcon,
  MessageSquareIcon,
  SparklesIcon,
} from "lucide-vue-next";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { toast } from "vue-sonner";
import type { TaskSummary } from "@/types";
import { isSummaryLimitedToday, summaryBullets } from "~/utils/ai-summary";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const modals = useModalsStore();
const aiStore = useProjectAiStore();
const userStore = useUserStore();
const workspaceStore = useWorkspaceStore();

const open = computed(() => modals.isOpen && modals.modalName === "projectAi");
const projectId = computed(() => String(modals.modalProps.projectId || ""));
const projectName = computed(() => String(modals.modalProps.name || "Project"));
const tab = ref<"briefings" | "chat">("briefings");

const summaries = computed(() => aiStore.summariesFor(projectId.value));
const latest = computed(() => summaries.value[0] ?? null);
const limitedToday = computed(() =>
  isSummaryLimitedToday(latest.value?.generatedAt, userStore.user?.email),
);
const locked = computed(() => !aiStore.loading && !aiStore.canUseAi);

const billingRoute = computed(() =>
  workspaceStore.activeWorkspaceId
    ? {
        name: "workspace-billing",
        params: { workspaceId: workspaceStore.activeWorkspaceId },
      }
    : null,
);

const formatWhen = (value: TaskSummary["generatedAt"]) => {
  if (!value) return { relative: "Earlier", exact: "" };
  const date = typeof value === "string" ? parseISO(value) : new Date(value);
  if (Number.isNaN(date.getTime())) return { relative: "Earlier", exact: "" };
  return {
    relative: formatDistanceToNow(date, { addSuffix: true }),
    exact: format(date, "MMM d, yyyy · h:mm a"),
  };
};

const onOpen = (value: boolean) => {
  if (!value) modals.closeModal();
};

watch(
  () => [open.value, projectId.value] as const,
  async ([isOpen, id]) => {
    if (!isOpen || !id) return;
    tab.value = modals.modalProps.tab === "chat" ? "chat" : "briefings";
    try {
      await aiStore.fetchProjectAi(id);
    } catch (error: any) {
      toast.error("Could not load AI briefings", {
        description: error?.data?.message || "Please try again.",
      });
    }
  },
  { immediate: true },
);

const generate = async () => {
  if (aiStore.generating || limitedToday.value || !projectId.value) return;
  try {
    const { created } = await aiStore.generateSummary(projectId.value);
    if (!created) {
      toast.message("A briefing can only be generated once a day", {
        description: "Come back tomorrow to refresh it.",
      });
    }
  } catch (error: any) {
    toast.error("Could not generate a briefing", {
      description: error?.data?.message || "Please try again.",
    });
  }
};

</script>

<template>
  <Sheet :open="open" @update:open="onOpen">
    <SheetContent
      side="right"
      overlay-class="z-[80]"
      class="z-[80] flex h-full w-full flex-col gap-0 p-0 sm:max-w-xl"
    >
      <SheetHeader class="space-y-3 border-b border-border px-6 py-4 pr-12 text-left">
        <div class="space-y-1">
          <SheetTitle class="flex items-center gap-2">
            <SparklesIcon class="h-4 w-4 text-primary" />
            Project AI
          </SheetTitle>
          <SheetDescription class="truncate">{{ projectName }}</SheetDescription>
        </div>
        <Tabs
          :model-value="tab"
          @update:model-value="(value) => { if (value === 'briefings' || value === 'chat') tab = value }"
        >
          <TabsList class="grid w-full grid-cols-2">
            <TabsTrigger value="briefings">
              <SparklesIcon class="h-3.5 w-3.5" />
              Briefings
            </TabsTrigger>
            <TabsTrigger value="chat">
              <MessageSquareIcon class="h-3.5 w-3.5" />
              Chat
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </SheetHeader>

      <div
        v-if="locked"
        class="m-6 flex flex-col items-start gap-3 rounded-xl border border-border bg-muted/40 p-4"
      >
        <div class="flex items-start gap-3">
          <div
            class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-background text-muted-foreground"
          >
            <LockIcon class="h-4 w-4" />
          </div>
          <div>
            <p class="text-sm font-medium text-foreground">
              AI briefings and chat are on Team and Business
            </p>
            <p class="mt-0.5 text-sm text-muted-foreground">
              Get a daily project briefing and ask questions about the board.
            </p>
          </div>
        </div>
        <Button v-if="billingRoute" as-child size="sm" class="h-8">
          <NuxtLink :to="billingRoute" @click="modals.closeModal()">Upgrade</NuxtLink>
        </Button>
      </div>

      <!-- Briefings timeline -->
      <template v-else-if="tab === 'briefings'">
        <div class="flex items-center justify-between gap-3 border-b border-border px-6 py-3">
          <p class="text-xs text-muted-foreground">
            One briefing per project per day, built from cards, comments, and
            activity.
          </p>
          <Button
            type="button"
            size="sm"
            class="h-8 shrink-0"
            :variant="latest ? 'outline' : 'default'"
            :disabled="aiStore.generating || aiStore.loading || limitedToday"
            @click="generate"
          >
            <Loader2Icon v-if="aiStore.generating" class="h-3.5 w-3.5 animate-spin" />
            <SparklesIcon v-else class="h-3.5 w-3.5" />
            {{
              aiStore.generating
                ? "Generating…"
                : limitedToday
                  ? "Generated today"
                  : latest
                    ? "Generate new"
                    : "Generate briefing"
            }}
          </Button>
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <div v-if="aiStore.loading && !summaries.length" class="space-y-4">
            <Skeleton v-for="index in 3" :key="index" class="h-28 w-full rounded-xl" />
          </div>

          <div
            v-else-if="!summaries.length"
            class="flex flex-col items-center gap-2 py-12 text-center"
          >
            <SparklesIcon class="h-6 w-6 text-muted-foreground" />
            <p class="text-sm text-muted-foreground">
              No briefings yet. Generate one to see where the project stands.
            </p>
          </div>

          <ol v-else class="relative space-y-5">
            <div
              class="pointer-events-none absolute bottom-4 top-3 start-4 w-[2px] -translate-x-1/2 rounded-full bg-gradient-to-b from-primary/40 via-border to-transparent"
              aria-hidden="true"
            />
            <li
              v-for="(item, index) in summaries"
              :key="item.id"
              class="relative flex items-start gap-3"
            >
              <span
                class="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-4 ring-background"
                :class="
                  index === 0
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted text-muted-foreground'
                "
              >
                <SparklesIcon class="h-3.5 w-3.5" />
              </span>
              <article
                class="min-w-0 flex-1 rounded-xl border bg-card px-4 py-3 shadow-sm"
                :class="index === 0 ? 'border-primary/30' : 'border-border'"
              >
                <div class="flex items-center justify-between gap-3">
                  <p class="text-xs font-semibold text-foreground">
                    {{ index === 0 ? "Latest briefing" : "Briefing" }}
                  </p>
                  <span
                    class="text-[11px] tabular-nums text-muted-foreground"
                    :title="formatWhen(item.generatedAt).exact"
                  >
                    {{ formatWhen(item.generatedAt).relative }}
                  </span>
                </div>
                <ul
                  class="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-foreground marker:text-muted-foreground"
                >
                  <li v-for="(line, i) in summaryBullets(item.progress)" :key="`p-${i}`">
                    {{ line }}
                  </li>
                </ul>
                <p class="mt-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Next
                </p>
                <ol
                  class="mt-1 list-decimal space-y-1 pl-5 text-sm leading-6 text-muted-foreground"
                >
                  <li v-for="(line, i) in summaryBullets(item.furtherAction)" :key="`a-${i}`">
                    {{ line }}
                  </li>
                </ol>
              </article>
            </li>
          </ol>
        </div>
      </template>

      <ProjectAiChat
        v-else
        :key="projectId"
        :project-id="projectId"
        :project-name="projectName"
      />
    </SheetContent>
  </Sheet>
</template>
