<script setup lang="ts">
defineProps<{
  title: string;
  description?: string;
}>();
</script>

<template>
  <section class="space-y-3">
    <div
      class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
    >
      <div class="min-w-0">
        <h2>{{ title }}</h2>
        <p
          v-if="description"
          class="mt-0.5 text-[12px] leading-4 text-muted-foreground"
        >
          {{ description }}
        </p>
      </div>
      <div
        v-if="$slots.actions"
        class="flex shrink-0 flex-wrap items-center gap-1.5"
      >
        <slot name="actions" />
      </div>
    </div>
    <slot />
  </section>
</template>
