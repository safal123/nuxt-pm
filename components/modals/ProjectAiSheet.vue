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
      overlay-class="z-[80] bg-black/20 backdrop-blur-md"
      class="z-[80] flex h-full w-full flex-col gap-0 p-0 sm:max-w-lg"
    >
      <SheetHeader class="gap-y-2 space-y-0 border-b border-border px-4 py-2 pr-12 text-left">
        <div>
          <SheetTitle class="flex items-center gap-1.5">
            <SparklesIcon class="size-3.5 text-muted-foreground" />
            Project AI
          </SheetTitle>
          <SheetDescription class="truncate text-[12px]">{{ projectName }}</SheetDescription>
        </div>
        <Tabs
          :model-value="tab"
          @update:model-value="(value) => { if (value === 'briefings' || value === 'chat') tab = value }"
        >
          <TabsList class="grid h-8 w-full grid-cols-2">
            <TabsTrigger value="briefings">
              <SparklesIcon class="size-3.5" />
              Briefings
            </TabsTrigger>
            <TabsTrigger value="chat">
              <MessageSquareIcon class="size-3.5" />
              Chat
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </SheetHeader>

      <div
        v-if="locked"
        class="m-4 flex flex-col items-start gap-2.5 rounded-xl border border-border bg-muted/40 p-3"
      >
        <div class="flex items-start gap-2.5">
          <div
            class="flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground"
          >
            <LockIcon class="size-3.5" />
          </div>
          <div>
            <p class="text-[13px] font-medium text-foreground">
              AI briefings and chat are on Team and Business
            </p>
            <p class="mt-0.5 text-[12px] text-muted-foreground">
              Get a daily project briefing and ask questions about the board.
            </p>
          </div>
        </div>
        <Button v-if="billingRoute" as-child variant="outline">
          <NuxtLink :to="billingRoute" @click="modals.closeModal()">Upgrade</NuxtLink>
        </Button>
      </div>

      <!-- Briefings timeline -->
      <template v-else-if="tab === 'briefings'">
        <div class="flex items-center justify-between gap-3 border-b border-border px-4 py-2">
          <p class="text-[12px] text-muted-foreground">
            One briefing per project per day, built from cards, comments, and
            activity.
          </p>
          <Button
            type="button"
            class="shrink-0"
            :variant="latest ? 'outline' : 'default'"
            :disabled="aiStore.generating || aiStore.loading || limitedToday"
            @click="generate"
          >
            <Loader2Icon v-if="aiStore.generating" class="size-3.5 animate-spin" />
            <SparklesIcon v-else class="size-3.5" />
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

        <div class="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <div v-if="aiStore.loading && !summaries.length" class="space-y-2.5">
            <Skeleton v-for="index in 3" :key="index" class="h-24 w-full rounded-xl" />
          </div>

          <div
            v-else-if="!summaries.length"
            class="flex flex-col items-center gap-1.5 py-10 text-center"
          >
            <SparklesIcon class="size-4 text-muted-foreground" />
            <p class="text-[12px] text-muted-foreground">
              No briefings yet. Generate one to see where the project stands.
            </p>
          </div>

          <ol v-else class="relative space-y-3">
            <div
              class="pointer-events-none absolute bottom-3 top-2.5 start-3.5 w-px -translate-x-1/2 bg-border"
              aria-hidden="true"
            />
            <li
              v-for="(item, index) in summaries"
              :key="item.id"
              class="relative flex items-start gap-2.5"
            >
              <span
                class="relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full ring-4 ring-background"
                :class="
                  index === 0
                    ? 'bg-muted text-foreground'
                    : 'bg-muted text-muted-foreground'
                "
              >
                <SparklesIcon class="size-3.5" />
              </span>
              <article
                class="min-w-0 flex-1 rounded-xl border border-border bg-card px-3 py-2.5"
                :class="index === 0 ? 'border-foreground/20' : 'border-border'"
              >
                <div class="flex items-center justify-between gap-3">
                  <p class="text-[12px] font-semibold text-foreground">
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
                  class="mt-1.5 list-disc space-y-0.5 pl-4 text-[13px] leading-5 text-foreground marker:text-muted-foreground"
                >
                  <li v-for="(line, i) in summaryBullets(item.progress)" :key="`p-${i}`">
                    {{ line }}
                  </li>
                </ul>
                <p class="mt-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Next
                </p>
                <ol
                  class="mt-1 list-decimal space-y-0.5 pl-4 text-[13px] leading-5 text-muted-foreground"
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
