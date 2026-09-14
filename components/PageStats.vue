<script setup lang="ts">
import type { Component } from "vue";
import { Skeleton } from "@/components/ui/skeleton";

defineProps<{
  items: { label: string; value: string | number; icon: Component }[];
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
      :key="item.label"
      class="flex items-start gap-3 border-border px-4 py-3.5"
      :class="{
        'border-t': index > 0,
        'sm:border-t-0': index === 1,
        'sm:border-r': index % 2 === 0 && index !== items.length - 1,
        'xl:border-r': index < items.length - 1,
        'xl:border-t-0': items.length >= 4 ? index > 1 : index > 0,
      }"
    >
      <div
        class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"
      >
        <component :is="item.icon" class="h-4 w-4" />
      </div>
      <div class="min-w-0">
        <p class="text-xs font-medium text-muted-foreground">{{ item.label }}</p>
        <Skeleton v-if="loading" class="mt-1.5 h-6 w-12" />
        <p
          v-else
          class="mt-0.5 text-xl font-semibold tabular-nums tracking-tight text-foreground"
        >
          {{ item.value }}
        </p>
      </div>
    </div>
  </div>
</template>
