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
      overlay-class="z-[90] bg-black/20 backdrop-blur-md"
      class="z-[90] max-w-md gap-0 rounded-xl p-0 sm:max-w-lg sm:rounded-xl"
      :class="activity?.email ? 'sm:max-w-2xl' : ''"
    >
      <DialogHeader class="border-b border-border px-5 py-3">
        <DialogTitle class="text-[14px] font-semibold tracking-tight">
          Activity details
        </DialogTitle>
        <DialogDescription class="text-[12px]">
          {{ when.relative }}
        </DialogDescription>
      </DialogHeader>

      <div v-if="activity" class="max-h-[70vh] space-y-4 overflow-y-auto px-5 py-4">
        <div class="flex items-start gap-2.5">
          <div
            class="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-[10px] font-medium text-foreground"
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
            <p class="text-[13px] font-medium text-foreground">
              {{ activity.user.name || activity.user.email }}
            </p>
            <p
              v-if="activity.user.email && activity.user.name"
              class="text-[12px] text-muted-foreground"
            >
              {{ activity.user.email }}
            </p>
            <p class="mt-1 text-[12px] leading-4 text-muted-foreground">
              {{ activity.message }}
            </p>
          </div>
        </div>

        <dl class="overflow-hidden rounded-lg border border-border">
          <div class="grid grid-cols-[96px_1fr] gap-2.5 border-b border-border px-2.5 py-2">
            <dt class="text-[11px] font-medium text-muted-foreground">Type</dt>
            <dd>
              <span :class="activityTypeChip(activity.type)">
                <ActivityTypeIcon :type="activity.type" class="h-3 w-3" />
                {{ activityTypeLabel(activity.type) }}
              </span>
            </dd>
          </div>
          <div class="grid grid-cols-[96px_1fr] gap-2.5 border-b border-border px-2.5 py-2">
            <dt class="text-[11px] font-medium text-muted-foreground">When</dt>
            <dd class="text-[12px] text-foreground">{{ when.exact }}</dd>
          </div>
          <div class="grid grid-cols-[96px_1fr] gap-2.5 border-b border-border px-2.5 py-2">
            <dt class="text-[11px] font-medium text-muted-foreground">Project</dt>
            <dd class="text-[12px] text-foreground">
              {{ activity.project?.name || "Workspace" }}
            </dd>
          </div>
          <div
            v-if="activity.task"
            class="grid grid-cols-[96px_1fr] gap-2.5 border-b border-border px-2.5 py-2"
          >
            <dt class="text-[11px] font-medium text-muted-foreground">Card</dt>
            <dd class="text-[12px] text-foreground">{{ activity.task.title }}</dd>
          </div>
          <div
            v-if="activity.email"
            class="grid grid-cols-[96px_1fr] gap-2.5 border-b border-border px-2.5 py-2"
          >
            <dt class="text-[11px] font-medium text-muted-foreground">To</dt>
            <dd class="truncate text-[12px] text-foreground">
              {{ activity.email.toEmail }}
            </dd>
          </div>
          <div
            v-if="activity.email"
            class="grid grid-cols-[96px_1fr] gap-2.5 border-b border-border px-2.5 py-2"
          >
            <dt class="text-[11px] font-medium text-muted-foreground">Subject</dt>
            <dd class="text-[12px] text-foreground">{{ activity.email.subject }}</dd>
          </div>
          <div
            v-if="activity.email"
            class="grid grid-cols-[96px_1fr] gap-2.5 border-b border-border px-2.5 py-2"
          >
            <dt class="text-[11px] font-medium text-muted-foreground">Template</dt>
            <dd class="text-[12px] text-foreground">
              {{ activity.email.templateLabel }}
            </dd>
          </div>
          <div
            v-if="activity.email"
            class="grid grid-cols-[96px_1fr] gap-2.5 px-2.5 py-2"
          >
            <dt class="text-[11px] font-medium text-muted-foreground">Status</dt>
            <dd class="text-[12px] capitalize text-foreground">
              {{ activity.email.status }}
            </dd>
          </div>
        </dl>

        <ActivityChange v-if="preview" :preview="preview" />

        <p
          v-if="activity.email?.error"
          class="rounded-lg border border-destructive/30 bg-destructive/5 px-2.5 py-1.5 text-[12px] text-destructive"
        >
          {{ activity.email.error }}
        </p>

        <div v-if="activity.email?.html" class="space-y-2">
          <p class="text-[11px] font-medium text-muted-foreground">
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

      <DialogFooter class="gap-1.5 border-t border-border px-5 py-2.5 sm:justify-between">
        <div class="flex flex-wrap gap-1.5">
          <Button
            v-if="activity?.task || activity?.project?.id"
            variant="outline"
            class="h-8 rounded-lg px-3 text-[12px] font-medium [&_svg]:size-3.5"
            @click="viewTimeline"
          >
            <HistoryIcon />
            View timeline
          </Button>
          <Button
            v-if="projectHref"
            variant="ghost"
            class="h-8 rounded-lg px-3 text-[12px] font-medium [&_svg]:size-3.5"
            as-child
          >
            <NuxtLink :to="projectHref" @click="close">
              <LayoutGridIcon />
              Open project
            </NuxtLink>
          </Button>
        </div>
        <Button
          variant="outline"
          class="h-8 rounded-lg px-3 text-[12px] font-medium"
          @click="close"
        >
          Close
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
