<script setup lang="ts">
import { HistoryIcon, LayoutGridIcon } from "lucide-vue-next";
import { api } from "~/lib/api";
import type {
  ActivityTimelineKind,
  WorkspaceActivitiesResponse,
  WorkspaceActivity,
} from "@/types";
import {
  ACTIVITY_TIMELINE_LIMIT,
  ALL,
  emptyActivitySummary,
} from "@/utils/activity";
import { Button } from "@/components/ui/button";

const store = useModalsStore();
const workspaceStore = useWorkspaceStore();
const route = useRoute();

const open = computed(
  () => store.isOpen && store.modalName === "activityTimeline",
);

const kind = computed<ActivityTimelineKind | null>(() => {
  const value = store.modalProps.kind;
  return value === "project" || value === "task" ? value : null;
});

const targetId = computed(() => String(store.modalProps.id || ""));
const targetName = computed(() =>
  String(store.modalProps.name || (kind.value === "task" ? "Card" : "Project")),
);

const activities = ref<WorkspaceActivity[]>([]);
const summary = ref(emptyActivitySummary());
const loading = ref(false);
const error = ref<string | null>(null);
const selected = ref<WorkspaceActivity | null>(null);

const workspaceId = computed(
  () =>
    workspaceStore.activeWorkspaceId || String(route.params.workspaceId || ""),
);

const title = computed(() =>
  kind.value === "task" ? "Card timeline" : "Project timeline",
);

const projectHref = computed(() => {
  if (kind.value !== "project" || !workspaceId.value || !targetId.value) {
    return null;
  }
  return `/w/${workspaceId.value}/projects/${targetId.value}`;
});

const close = () => {
  selected.value = null;
  store.closeModal();
};

const onOpen = (value: boolean) => {
  if (!value) close();
};

const fetchTimeline = async () => {
  if (!open.value || !kind.value || !targetId.value || !workspaceId.value) {
    activities.value = [];
    summary.value = emptyActivitySummary();
    return;
  }

  loading.value = true;
  error.value = null;
  try {
    const result = await api<WorkspaceActivitiesResponse>(
      `/api/workspaces/${workspaceId.value}/activities`,
      {
        query: {
          projectId: kind.value === "project" ? targetId.value : ALL,
          taskId: kind.value === "task" ? targetId.value : ALL,
          kind: kind.value === "task" ? "task" : ALL,
          page: 1,
          limit: ACTIVITY_TIMELINE_LIMIT,
        },
      },
    );
    activities.value = result.activities ?? [];
    summary.value = result.summary ?? emptyActivitySummary();
  } catch (err: any) {
    error.value = err?.data?.message || err?.message || "Could not load timeline.";
    activities.value = [];
    summary.value = emptyActivitySummary();
  } finally {
    loading.value = false;
  }
};

watch(
  () => [open.value, kind.value, targetId.value, workspaceId.value] as const,
  ([isOpen]) => {
    if (!isOpen) {
      activities.value = [];
      selected.value = null;
      error.value = null;
      return;
    }
    void fetchTimeline();
  },
);
</script>

<template>
  <Sheet :open="open" @update:open="onOpen">
    <SheetContent
      side="right"
      overlay-class="z-[80]"
      class="z-[80] flex h-full w-full flex-col gap-0 p-0 sm:max-w-xl"
    >
      <SheetHeader class="space-y-1 border-b border-border px-6 py-4 pr-12 text-left">
        <SheetTitle class="flex items-center gap-2">
          <HistoryIcon class="h-4 w-4 text-muted-foreground" />
          {{ title }}
        </SheetTitle>
        <SheetDescription class="truncate">
          {{ targetName }}
        </SheetDescription>
        <p
          v-if="!loading && summary.total"
          class="text-xs text-muted-foreground"
        >
          {{ summary.total }}
          {{ summary.total === 1 ? "event" : "events" }}
          · {{ summary.people }}
          {{ summary.people === 1 ? "person" : "people" }}
          · {{ summary.thisWeek }} this week
        </p>
      </SheetHeader>

      <div class="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        <div v-if="error" class="flex flex-col items-center gap-2 py-10 text-center">
          <p class="text-sm text-muted-foreground">{{ error }}</p>
          <Button type="button" variant="outline" size="sm" @click="fetchTimeline">
            Try again
          </Button>
        </div>
        <ActivityTimeline
          v-else
          :activities="activities"
          :loading="loading"
          @select="selected = $event"
        />
      </div>

      <div
        v-if="projectHref"
        class="border-t border-border px-6 py-3"
      >
        <Button variant="outline" size="sm" as-child>
          <NuxtLink :to="projectHref">
            <LayoutGridIcon class="h-4 w-4" />
            Open project
          </NuxtLink>
        </Button>
      </div>
    </SheetContent>
  </Sheet>

  <ActivityDetailModal :activity="selected" @close="selected = null" />
</template>
