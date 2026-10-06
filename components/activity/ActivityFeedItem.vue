<script setup lang="ts">
import type { WorkspaceActivity } from "@/types";
import {
  activityChangePreview,
  activitySubject,
  activityTypeLabel,
  personInitials,
} from "@/utils/activity";
import { activityTypeChip } from "@/utils/table-chips";
import { whenDate } from "@/utils/date";

const props = defineProps<{
  activity: WorkspaceActivity;
}>();

const emit = defineEmits<{
  select: [];
  timeline: [kind: "project" | "task", id: string, name: string];
}>();

const when = computed(() => whenDate(props.activity.createdAt));
const preview = computed(() => activityChangePreview(props.activity));
const subject = computed(() => activitySubject(props.activity));
const route = useRoute();
const profileHref = computed(() => {
  const workspaceId = String(route.params.workspaceId || "");
  const id = props.activity.user?.id;
  if (!workspaceId || !id || id === "system") return null;
  return `/w/${workspaceId}/members/${id}`;
});

const openTask = (event: Event) => {
  event.stopPropagation();
  const task = props.activity.task;
  if (!task) return;
  emit("timeline", "task", task.id, task.title);
};

const openProject = (event: Event) => {
  event.stopPropagation();
  const project = props.activity.project;
  if (!project?.id) return;
  emit("timeline", "project", project.id, project.name);
};
</script>

<template>
  <div
    class="flex w-full cursor-pointer items-start gap-2.5 px-3 py-2.5 text-left hover:bg-accent/50"
    role="button"
    tabindex="0"
    @click="emit('select')"
    @keyup.enter="emit('select')"
  >
    <div
      class="mt-0.5 flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-[10px] font-medium text-foreground"
    >
      <img
        v-if="activity.user.imageUrl"
        :src="activity.user.imageUrl"
        alt=""
        class="h-full w-full object-cover"
      />
      <span v-else>{{ personInitials(activity.user) }}</span>
    </div>

    <div class="min-w-0 flex-1">
      <div class="flex items-start justify-between gap-2">
        <p class="min-w-0 text-[13px] leading-5">
          <NuxtLink
            v-if="profileHref"
            :to="profileHref"
            class="font-medium text-foreground hover:underline"
            @click.stop
          >
            {{ activity.user.name || activity.user.email }}
          </NuxtLink>
          <span v-else class="font-medium text-foreground">{{
            activity.user.name || activity.user.email
          }}</span>
          {{ " " }}
          <span class="text-muted-foreground">{{ activity.message }}</span>
        </p>
        <span
          class="shrink-0 pt-0.5 text-[11px] tabular-nums text-muted-foreground"
          :title="when.title"
        >
          {{ when.label }}
        </span>
      </div>

      <div class="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1">
        <span :class="activityTypeChip(activity.type)">
          <ActivityTypeIcon :type="activity.type" class="size-3" />
          {{ activityTypeLabel(activity.type) }}
        </span>
        <button
          v-if="activity.task"
          type="button"
          class="max-w-[16rem] truncate text-[12px] font-medium text-foreground hover:underline"
          :title="`Card timeline: ${activity.task.title}`"
          @click="openTask"
        >
          {{ activity.task.title }}
        </button>
        <span
          v-else-if="subject"
          class="max-w-[16rem] truncate text-[12px] text-muted-foreground"
        >
          {{ subject }}
        </span>
        <button
          v-if="activity.project?.id"
          type="button"
          class="max-w-[12rem] truncate text-[12px] text-muted-foreground hover:text-foreground hover:underline"
          :title="`Project timeline: ${activity.project.name}`"
          @click="openProject"
        >
          {{ activity.project.name }}
        </button>
      </div>

      <ActivityChange v-if="preview" :preview="preview" />
    </div>
  </div>
</template>
