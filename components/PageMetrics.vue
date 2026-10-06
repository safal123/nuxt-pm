<script setup lang="ts">
import { Skeleton } from "@/components/ui/skeleton";

export type PageMetric = {
  id: string;
  label: string;
  value: string | number;
  hint?: string;
  suffix?: string;
  badge?: string;
};

defineProps<{
  items: PageMetric[];
  loading?: boolean;
}>();
</script>

<template>
  <div
    class="grid overflow-hidden rounded-xl border border-border bg-card sm:grid-cols-2"
    :class="items.length >= 4 ? 'xl:grid-cols-4' : items.length === 3 ? 'xl:grid-cols-3' : ''"
  >
    <div
      v-for="(item, index) in items"
      :key="item.id"
      class="border-border px-3 py-2.5"
      :class="{
        'border-t': index > 0,
        'sm:border-t-0': index === 1,
        'sm:border-r': index % 2 === 0 && index !== items.length - 1,
        'xl:border-r': index < items.length - 1,
        'xl:border-t-0': items.length >= 4 ? index > 1 : index > 0,
      }"
    >
      <p class="text-[11px] font-medium text-muted-foreground">{{ item.label }}</p>
      <Skeleton v-if="loading" class="mt-1 h-5 w-16" />
      <template v-else>
        <div class="mt-0.5 flex items-center gap-1.5">
          <p class="text-[15px] font-semibold tabular-nums tracking-tight text-foreground">
            {{ item.value }}
            <span
              v-if="item.suffix"
              class="text-[12px] font-medium text-muted-foreground"
            >
              {{ item.suffix }}
            </span>
          </p>
          <span
            v-if="item.badge"
            class="rounded-md bg-muted px-1.5 py-px text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
          >
            {{ item.badge }}
          </span>
        </div>
        <p v-if="item.hint" class="mt-0.5 text-[11px] text-muted-foreground">
          {{ item.hint }}
        </p>
        <slot :name="item.id" />
      </template>
    </div>
  </div>
</template>
