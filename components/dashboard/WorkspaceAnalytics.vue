<script setup lang="ts">
import { AreaChart } from "@/components/ui/chart-area";
import { BarChart } from "@/components/ui/chart-bar";
import { Skeleton } from "@/components/ui/skeleton";
import type { WorkspaceAnalytics } from "~/composables/useWorkspaceSummary";

const props = defineProps<{
  analytics: WorkspaceAnalytics;
  pending?: boolean;
}>();

const hasActivity = computed(() =>
  props.analytics.activity.some(
    (point) => point.Created > 0 || point.Completed > 0,
  ),
);

const truncateProject = (tick: number | Date) => {
  const label = props.analytics.projects[Number(tick)]?.project ?? "";
  return label.length > 14 ? `${label.slice(0, 13)}…` : label;
};
</script>

<template>
  <div class="grid gap-3 lg:grid-cols-5">
    <template v-if="pending">
      <Skeleton class="h-[260px] rounded-xl lg:col-span-3" />
      <Skeleton class="h-[260px] rounded-xl lg:col-span-2" />
    </template>

    <template v-else>
      <div
        class="min-w-0 rounded-xl border border-border bg-card p-4 lg:col-span-3"
      >
        <p class="text-sm font-medium text-foreground">Created vs completed</p>
        <p class="mt-0.5 text-xs text-muted-foreground">Last 14 days</p>
        <ClientOnly v-if="hasActivity">
          <AreaChart
            :data="analytics.activity"
            index="date"
            :categories="['Created', 'Completed']"
            :colors="['hsl(var(--primary))', 'hsl(160 81% 40%)']"
            :show-legend="true"
            class="mt-2 !h-[220px]"
          />
          <template #fallback>
            <Skeleton class="mt-2 h-[220px] w-full rounded-lg" />
          </template>
        </ClientOnly>
        <p
          v-else
          class="flex h-[220px] items-center justify-center text-sm text-muted-foreground"
        >
          Card volume will appear here.
        </p>
      </div>

      <div
        class="min-w-0 rounded-xl border border-border bg-card p-4 lg:col-span-2"
      >
        <p class="text-sm font-medium text-foreground">By project</p>
        <p class="mt-0.5 text-xs text-muted-foreground">Open and done cards</p>
        <ClientOnly v-if="analytics.projects.length">
          <BarChart
            :data="analytics.projects"
            index="project"
            :categories="['Open', 'Done']"
            type="stacked"
            :rounded-corners="4"
            :colors="['hsl(var(--primary))', 'hsl(160 81% 40%)']"
            :x-formatter="truncateProject"
            :show-legend="true"
            :margin="{ top: 4, right: 4, left: 4, bottom: 0 }"
            class="mt-2 !h-[220px]"
          />
          <template #fallback>
            <Skeleton class="mt-2 h-[220px] w-full rounded-lg" />
          </template>
        </ClientOnly>
        <p
          v-else
          class="flex h-[220px] items-center justify-center text-sm text-muted-foreground"
        >
          No project workload yet.
        </p>
      </div>
    </template>
  </div>
</template>
