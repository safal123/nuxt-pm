<script setup lang="ts">
import { AlertCircleIcon, CheckCircle2Icon, CircleIcon } from "lucide-vue-next";
import { cn } from "@/lib/utils";
import type { CalendarEntry } from "~/types";
import { shortTime, tint } from "~/utils/calendar";

const props = withDefaults(
  defineProps<{
    entry: CalendarEntry;
    /** Day the chip is drawn on, so multi-day events can show "continues". */
    day?: string;
    showTime?: boolean;
  }>(),
  { showTime: true },
);

defineEmits<{ (e: "open", entry: CalendarEntry): void }>();

const isBlock = computed(
  () => props.entry.kind === "event" && (props.entry.allDay || props.entry.days.length > 1),
);
const continues = computed(
  () => isBlock.value && props.day !== undefined && props.entry.days[0] !== props.day,
);
const timeLabel = computed(() =>
  props.entry.kind === "event" && !props.entry.allDay && !continues.value
    ? shortTime(new Date(props.entry.startAt))
    : "",
);

const chipStyle = computed(() => {
  const { color, done } = props.entry;
  if (done) return { backgroundColor: tint(color, 8), borderLeftColor: tint(color, 45) };
  return {
    backgroundColor: tint(color, isBlock.value ? 24 : 14),
    borderLeftColor: color,
  };
});
</script>

<template>
  <button
    type="button"
    :draggable="entry.editable"
    :title="entry.overdue ? `Overdue · ${entry.title}` : entry.title"
    :class="
      cn(
        'flex w-full min-w-0 items-center gap-1 rounded-[5px] border-l-[3px] px-1.5 py-px text-left text-[11px] leading-4 text-foreground transition-[filter,box-shadow] hover:shadow-sm hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:hover:brightness-125',
        isBlock && 'font-medium',
        entry.editable && 'cursor-grab active:cursor-grabbing',
        entry.done && 'text-muted-foreground',
      )
    "
    :style="chipStyle"
    @click.stop="$emit('open', entry)"
  >
    <template v-if="entry.kind === 'task'">
      <CheckCircle2Icon
        v-if="entry.done"
        class="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400"
      />
      <AlertCircleIcon
        v-else-if="entry.overdue"
        class="h-3.5 w-3.5 shrink-0"
        :style="{ color: entry.color }"
      />
      <CircleIcon
        v-else
        class="h-3.5 w-3.5 shrink-0"
        :style="{ color: entry.color }"
        stroke-width="2.5"
      />
    </template>
    <span
      v-if="showTime && timeLabel"
      class="shrink-0 font-semibold tabular-nums"
      :style="{ color: `color-mix(in srgb, ${entry.color} 70%, currentColor)` }"
    >
      {{ timeLabel }}
    </span>
    <span :class="cn('truncate', entry.done && 'line-through')">
      <span v-if="continues" class="text-muted-foreground">…</span>{{ entry.title }}
    </span>
  </button>
</template>
