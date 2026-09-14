<script setup lang="ts">
import { HistoryIcon } from "lucide-vue-next";
import type { WorkspaceActivity } from "@/types";
import { groupActivitiesByDate } from "@/utils/activity";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const props = defineProps<{
  activities: WorkspaceActivity[];
  loading: boolean;
  error: string | null;
  page: number;
  total: number;
  pageSize: number;
  rangeLabel: string;
}>();

const emit = defineEmits<{
  select: [activity: WorkspaceActivity];
  timeline: [kind: "project" | "task", id: string, name: string];
  retry: [];
  "update:page": [value: number];
}>();

const groups = computed(() => groupActivitiesByDate(props.activities));
</script>

<template>
  <div class="overflow-hidden rounded-xl border border-border bg-card">
    <div v-if="error" class="flex flex-col items-center gap-2 px-4 py-16 text-center">
      <p class="text-sm text-muted-foreground">{{ error }}</p>
      <Button type="button" variant="outline" size="sm" @click="emit('retry')">
        Try again
      </Button>
    </div>

    <div
      v-else-if="loading && !activities.length"
      class="divide-y divide-border"
    >
      <div
        v-for="index in 6"
        :key="index"
        class="flex items-start gap-3 px-4 py-3.5"
      >
        <Skeleton class="h-9 w-9 shrink-0 rounded-full" />
        <div class="min-w-0 flex-1 space-y-2">
          <Skeleton class="h-4 w-2/3" />
          <Skeleton class="h-3 w-1/3" />
        </div>
      </div>
    </div>

    <div
      v-else-if="!activities.length"
      class="flex flex-col items-center px-4 py-16 text-center"
    >
      <div
        class="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground"
      >
        <HistoryIcon class="h-5 w-5" />
      </div>
      <p class="mt-3 text-sm font-medium text-foreground">No activity yet</p>
      <p class="mt-1 max-w-sm text-sm text-muted-foreground">
        Board changes, comments, and emails will show up here as the team works.
      </p>
    </div>

    <div v-else>
      <section
        v-for="group in groups"
        :key="group.key"
        class="border-b border-border last:border-b-0"
      >
        <p
          class="sticky top-0 z-10 border-b border-border bg-muted/50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
        >
          {{ group.label }}
        </p>
        <div class="divide-y divide-border">
          <ActivityFeedItem
            v-for="item in group.items"
            :key="item.id"
            :activity="item"
            @select="emit('select', item)"
            @timeline="(kind, id, name) => emit('timeline', kind, id, name)"
          />
        </div>
      </section>
    </div>

    <TablePagination
      :page="page"
      :total="total"
      :page-size="pageSize"
      :range-label="rangeLabel"
      @update:page="emit('update:page', $event)"
    />
  </div>
</template>
