<script setup lang="ts">
import type { WorkspaceActivity } from "@/types";
import {
  activityChangePreview,
  activityTypeLabel,
  groupActivitiesByDate,
  personInitials,
} from "@/utils/activity";
import { activityTypeChip, activityTypeNode } from "@/utils/table-chips";
import { whenDate } from "@/utils/date";
import { Skeleton } from "@/components/ui/skeleton";

const props = defineProps<{
  activities: WorkspaceActivity[];
  loading?: boolean;
  compact?: boolean;
  selectable?: boolean;
}>();

const emit = defineEmits<{
  select: [activity: WorkspaceActivity];
}>();

const groups = computed(() => groupActivitiesByDate(props.activities));

const onSelect = (item: WorkspaceActivity) => {
  if (props.selectable === false) return;
  emit("select", item);
};
</script>

<template>
  <div v-if="loading" class="relative space-y-3 ps-1">
    <div
      class="absolute bottom-2 top-2 start-3.5 w-[2px] -translate-x-1/2 rounded-full bg-border"
      aria-hidden="true"
    />
    <div v-for="index in 5" :key="index" class="flex gap-2.5">
      <Skeleton class="relative z-10 size-7 shrink-0 rounded-full" />
      <div class="min-w-0 flex-1 space-y-1.5 rounded-lg border border-border p-2.5">
        <Skeleton class="h-3.5 w-2/3" />
        <Skeleton class="h-2.5 w-1/3" />
      </div>
    </div>
  </div>

  <p
    v-else-if="!activities.length"
    class="py-6 text-center text-[12px] text-muted-foreground"
  >
    No activity recorded yet.
  </p>

  <div v-else class="relative">
    <div
      class="pointer-events-none absolute bottom-4 top-3 start-3.5 w-[2px] -translate-x-1/2 rounded-full bg-gradient-to-b from-muted-foreground/25 via-border to-transparent"
      aria-hidden="true"
    />

    <section
      v-for="(group, groupIndex) in groups"
      :key="group.key"
      :class="groupIndex ? 'mt-4' : ''"
    >
      <div
        class="sticky top-0 z-20 mb-2 flex items-center gap-2 bg-background/90 py-0.5 backdrop-blur-sm"
      >
        <span
          class="relative z-10 flex size-7 shrink-0 items-center justify-center"
        >
          <span
            class="h-2 w-2 rounded-full bg-muted-foreground/45 ring-4 ring-background"
          />
        </span>
        <p
          class="text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
        >
          {{ group.label }}
        </p>
      </div>

      <ol class="space-y-2">
        <li
          v-for="item in group.items"
          :key="item.id"
          class="relative flex items-start gap-2.5"
        >
          <span :class="activityTypeNode(item.type, 'sm')">
            <ActivityTypeIcon
              :type="item.type"
              class="size-3"
              :stroke-width="2"
            />
          </span>

          <component
            :is="selectable === false ? 'div' : 'button'"
            :type="selectable === false ? undefined : 'button'"
            class="min-w-0 flex-1 text-left"
            :class="
              compact
                ? 'py-0.5'
                : [
                    'rounded-lg border border-border bg-card px-2.5 py-2 shadow-sm',
                    selectable === false
                      ? ''
                      : 'transition-colors hover:bg-accent/50',
                  ]
            "
            @click="onSelect(item)"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="flex min-w-0 items-start gap-2">
                <span
                  class="mt-0.5 flex size-5 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-[9px] font-medium text-foreground"
                >
                  <img
                    v-if="item.user.imageUrl"
                    :src="item.user.imageUrl"
                    alt=""
                    class="h-full w-full object-cover"
                  />
                  <span v-else>{{ personInitials(item.user) }}</span>
                </span>
                <p class="min-w-0 text-[13px] leading-5">
                  <span class="font-medium text-foreground">{{
                    item.user.name || item.user.email
                  }}</span>
                  {{ " " }}
                  <span class="text-muted-foreground">{{ item.message }}</span>
                </p>
              </div>
              <span
                class="shrink-0 pt-0.5 text-[11px] tabular-nums text-muted-foreground"
                :title="whenDate(item.createdAt).title"
              >
                {{ whenDate(item.createdAt).label }}
              </span>
            </div>
            <div
              v-if="!compact"
              class="mt-1.5 flex flex-wrap items-center gap-1.5 ps-7"
            >
              <span :class="activityTypeChip(item.type)">
                {{ activityTypeLabel(item.type) }}
              </span>
              <span
                v-if="item.task"
                class="max-w-[16rem] truncate text-[12px] text-muted-foreground"
              >
                {{ item.task.title }}
              </span>
            </div>
            <div :class="compact ? '' : 'ps-7'">
              <ActivityChange
                v-if="activityChangePreview(item)"
                :preview="activityChangePreview(item)!"
              />
            </div>
          </component>
        </li>
      </ol>
    </section>
  </div>
</template>
