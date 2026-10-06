<script setup lang="ts">
defineProps<{
  title: string;
  description?: string;
}>();
</script>

<template>
  <div
    class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
  >
    <div class="min-w-0">
      <h1>{{ title }}</h1>
      <p
        v-if="description"
        class="mt-1 text-[12px] leading-4 text-muted-foreground"
      >
        {{ description }}
      </p>
    </div>
    <div
      v-if="$slots.default"
      class="flex shrink-0 flex-wrap items-center gap-1.5"
    >
      <slot />
    </div>
  </div>
</template>
