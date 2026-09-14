<script setup lang="ts">
import { HistoryIcon, LayoutGridIcon } from "lucide-vue-next";
import type { WorkspaceActivity } from "@/types";
import {
  activityChangePreview,
  activityTypeLabel,
  personInitials,
} from "@/utils/activity";
import { activityTypeChip } from "@/utils/table-chips";
import { whenDate } from "@/utils/date";
import { Button } from "@/components/ui/button";

const props = defineProps<{
  activity: WorkspaceActivity | null;
}>();

const emit = defineEmits<{
  (e: "close"): void;
}>();

const { openTimeline } = useActivityTimeline();
const route = useRoute();

const open = computed(() => !!props.activity);

const close = () => emit("close");

const onOpen = (value: boolean) => {
  if (!value) close();
};

const when = computed(() => {
  if (!props.activity) return { label: "—", title: "—" };
  const value = whenDate(props.activity.createdAt);
  return { relative: value.label, exact: value.title || "—" };
});

const preview = computed(() =>
  props.activity ? activityChangePreview(props.activity) : null,
);

const workspaceId = computed(() => String(route.params.workspaceId || ""));

const projectHref = computed(() => {
  const projectId = props.activity?.project?.id;
  if (!workspaceId.value || !projectId) return null;
  return `/w/${workspaceId.value}/projects/${projectId}`;
});

const viewTimeline = () => {
  const activity = props.activity;
  if (!activity) return;
  if (activity.task) {
    close();
    openTimeline({
      kind: "task",
      id: activity.task.id,
      name: activity.task.title,
    });
    return;
  }
  if (activity.project?.id) {
    close();
    openTimeline({
      kind: "project",
      id: activity.project.id,
      name: activity.project.name,
    });
  }
};
</script>

<template>
  <Dialog :open="open" @update:open="onOpen">
    <DialogContent
      overlay-class="z-[90]"
      class="z-[90] max-w-md gap-0 p-0 sm:max-w-lg"
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
            class="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-violet-100 text-[12px] font-semibold text-violet-700 dark:bg-violet-500/20 dark:text-violet-300"
          >
            <img
              v-if="activity.user.imageUrl"
              :src="activity.user.imageUrl"
              alt=""
              class="h-full w-full object-cover"
            />
            <span v-else>{{ personInitials(activity.user) }}</span>
          </div>
          <div class="min-w-0">
            <p class="text-sm font-semibold text-foreground">
              {{ activity.user.name || activity.user.email }}
            </p>
            <p
              v-if="activity.user.email && activity.user.name"
              class="text-xs text-muted-foreground"
            >
              {{ activity.user.email }}
            </p>
            <p class="mt-1 text-sm leading-5 text-muted-foreground">
              {{ activity.message }}
            </p>
          </div>
        </div>

        <dl class="overflow-hidden rounded-lg border border-border">
          <div class="grid grid-cols-[110px_1fr] gap-3 border-b border-border px-3 py-2.5">
            <dt class="text-xs font-medium text-muted-foreground">Type</dt>
            <dd>
              <span :class="activityTypeChip(activity.type)">
                <ActivityTypeIcon :type="activity.type" class="h-3 w-3" />
                {{ activityTypeLabel(activity.type) }}
              </span>
            </dd>
          </div>
          <div class="grid grid-cols-[110px_1fr] gap-3 border-b border-border px-3 py-2.5">
            <dt class="text-xs font-medium text-muted-foreground">When</dt>
            <dd class="text-sm text-foreground">{{ when.exact }}</dd>
          </div>
          <div class="grid grid-cols-[110px_1fr] gap-3 border-b border-border px-3 py-2.5">
            <dt class="text-xs font-medium text-muted-foreground">Project</dt>
            <dd class="text-sm text-foreground">
              {{ activity.project?.name || "Workspace" }}
            </dd>
          </div>
          <div
            v-if="activity.task"
            class="grid grid-cols-[110px_1fr] gap-3 border-b border-border px-3 py-2.5"
          >
            <dt class="text-xs font-medium text-muted-foreground">Card</dt>
            <dd class="text-sm text-foreground">{{ activity.task.title }}</dd>
          </div>
          <div
            v-if="activity.email"
            class="grid grid-cols-[110px_1fr] gap-3 border-b border-border px-3 py-2.5"
          >
            <dt class="text-xs font-medium text-muted-foreground">To</dt>
            <dd class="truncate text-sm text-foreground">
              {{ activity.email.toEmail }}
            </dd>
          </div>
          <div
            v-if="activity.email"
            class="grid grid-cols-[110px_1fr] gap-3 border-b border-border px-3 py-2.5"
          >
            <dt class="text-xs font-medium text-muted-foreground">Subject</dt>
            <dd class="text-sm text-foreground">{{ activity.email.subject }}</dd>
          </div>
          <div
            v-if="activity.email"
            class="grid grid-cols-[110px_1fr] gap-3 border-b border-border px-3 py-2.5"
          >
            <dt class="text-xs font-medium text-muted-foreground">Template</dt>
            <dd class="text-sm text-foreground">
              {{ activity.email.templateLabel }}
            </dd>
          </div>
          <div
            v-if="activity.email"
            class="grid grid-cols-[110px_1fr] gap-3 px-3 py-2.5"
          >
            <dt class="text-xs font-medium text-muted-foreground">Status</dt>
            <dd class="text-sm capitalize text-foreground">
              {{ activity.email.status }}
            </dd>
          </div>
        </dl>

        <ActivityChange v-if="preview" :preview="preview" />

        <p
          v-if="activity.email?.error"
          class="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          {{ activity.email.error }}
        </p>

        <div v-if="activity.email?.html" class="space-y-2">
          <p class="text-xs font-medium text-muted-foreground">
            Template preview
          </p>
          <iframe
            class="h-[360px] w-full rounded-lg border border-border bg-white"
            sandbox=""
            :srcdoc="activity.email.html"
            title="Email template preview"
          />
        </div>
      </div>

      <DialogFooter class="gap-2 border-t border-border px-6 py-4 sm:justify-between">
        <div class="flex flex-wrap gap-2">
          <Button
            v-if="activity?.task || activity?.project?.id"
            variant="outline"
            size="sm"
            @click="viewTimeline"
          >
            <HistoryIcon class="h-4 w-4" />
            View timeline
          </Button>
          <Button v-if="projectHref" variant="ghost" size="sm" as-child>
            <NuxtLink :to="projectHref" @click="close">
              <LayoutGridIcon class="h-4 w-4" />
              Open project
            </NuxtLink>
          </Button>
        </div>
        <Button variant="outline" size="sm" @click="close">Close</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
