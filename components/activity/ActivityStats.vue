<script setup lang="ts">
import {
  CalendarDaysIcon,
  HistoryIcon,
  MessageSquareIcon,
  UsersIcon,
} from "lucide-vue-next";
import type { ActivitySummary } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";

defineProps<{
  summary: ActivitySummary;
  loading?: boolean;
}>();

const STATS = [
  { key: "total" as const, label: "Events", icon: HistoryIcon },
  { key: "today" as const, label: "Today", icon: CalendarDaysIcon },
  { key: "thisWeek" as const, label: "This week", icon: CalendarDaysIcon },
  { key: "people" as const, label: "People", icon: UsersIcon },
];
</script>

<template>
  <div
    class="grid overflow-hidden rounded-xl border border-border bg-card sm:grid-cols-2 xl:grid-cols-4"
  >
    <div
      v-for="(stat, index) in STATS"
      :key="stat.key"
      class="flex items-start gap-2.5 border-border px-3 py-2.5"
      :class="{
        'border-t': index > 0,
        'sm:border-t-0': index === 1,
        'sm:border-r': index === 0 || index === 2,
        'xl:border-r': index < 3,
        'xl:border-t-0': index > 1,
      }"
    >
      <div
        class="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"
      >
        <component :is="stat.icon" class="size-3.5" />
      </div>
      <div class="min-w-0">
        <p class="text-[11px] font-medium text-muted-foreground">{{ stat.label }}</p>
        <Skeleton v-if="loading" class="mt-1 h-5 w-10" />
        <p v-else class="mt-0.5 text-[15px] font-semibold tracking-tight text-foreground">
          {{ summary[stat.key] }}
        </p>
      </div>
    </div>
  </div>
  <p
    v-if="!loading && (summary.comments || summary.emails)"
    class="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground"
  >
    <MessageSquareIcon class="size-3" />
    {{ summary.comments }}
    {{ summary.comments === 1 ? "comment" : "comments" }}
    <span v-if="summary.emails">
      · {{ summary.emails }}
      {{ summary.emails === 1 ? "email" : "emails" }}
    </span>
  </p>
</template>
