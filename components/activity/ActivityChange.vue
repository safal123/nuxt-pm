<script setup lang="ts">
import type { ActivityChangePreview } from "@/utils/activity";

defineProps<{
  preview: ActivityChangePreview;
}>();
</script>

<template>
  <div>
    <p
      v-if="preview.kind === 'comment'"
      class="mt-1.5 rounded-md border border-border bg-muted/40 px-2.5 py-1.5 text-[12px] leading-4 text-foreground whitespace-pre-wrap"
    >
      {{ preview.text }}
    </p>
    <p
      v-else-if="preview.kind === 'note'"
      class="mt-1 text-[12px] text-muted-foreground"
    >
      {{ preview.text }}
    </p>
    <div
      v-else-if="preview.kind === 'swap'"
      class="mt-1.5 inline-flex max-w-full items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2 py-0.5 text-[12px]"
    >
      <span class="shrink-0 font-medium text-muted-foreground">{{
        preview.label
      }}</span>
      <span
        v-if="preview.from"
        class="min-w-0 truncate text-muted-foreground line-through"
      >
        {{ preview.from }}
      </span>
      <span v-else class="text-muted-foreground">—</span>
      <span class="shrink-0 text-muted-foreground">→</span>
      <span class="min-w-0 truncate font-medium text-foreground">
        {{ preview.to || "cleared" }}
      </span>
    </div>
    <div
      v-else-if="preview.kind === 'dates'"
      class="mt-1.5 overflow-hidden rounded-md border border-border bg-muted/40"
    >
      <div
        v-for="(change, index) in preview.changes"
        :key="`${change.field}-${index}`"
        class="flex items-center gap-2.5 px-2.5 py-1 text-[12px]"
        :class="index ? 'border-t border-border' : ''"
      >
        <span class="w-12 shrink-0 font-medium text-muted-foreground">{{
          change.field
        }}</span>
        <span class="min-w-0 flex-1">
          <template v-if="change.from && change.to">
            <span class="text-muted-foreground line-through">{{
              change.from
            }}</span>
            <span class="mx-1.5 text-muted-foreground">→</span>
            <span class="text-foreground">{{ change.to }}</span>
          </template>
          <template v-else-if="change.to">
            {{ change.to }}
          </template>
          <template v-else-if="change.from">
            <span class="text-muted-foreground line-through">{{
              change.from
            }}</span>
            <span class="ml-1.5 text-muted-foreground">cleared</span>
          </template>
        </span>
      </div>
    </div>
  </div>
</template>
