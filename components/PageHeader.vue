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
        class="mt-1 text-[12px] font-normal leading-5 text-muted-foreground"
      >
        {{ description }}
      </p>
    </div>
    <div
      v-if="$slots.default"
      class="flex w-full min-w-0 shrink-0 flex-wrap items-center gap-1.5 sm:w-auto"
    >
      <slot />
    </div>
  </div>
</template>
