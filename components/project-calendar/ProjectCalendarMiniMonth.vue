<script setup lang="ts">
import { addMonths, format, isSameDay, isSameMonth, isToday } from "date-fns";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-vue-next";
import { cn } from "@/lib/utils";
import type { CalendarViewMode } from "~/types";
import { dayKey, monthGrid, weekDays, type WeekStart } from "~/utils/calendar";

const props = defineProps<{
  cursor: Date;
  mode: CalendarViewMode;
  weekStartsOn: WeekStart;
  busyDays: Set<string>;
}>();

const emit = defineEmits<{ (e: "select", date: Date): void }>();

const month = ref(props.cursor);
watch(
  () => props.cursor,
  (value) => {
    if (!isSameMonth(value, month.value)) month.value = value;
  },
);

const days = computed(() => monthGrid(month.value, props.weekStartsOn));
const weekdayLetters = computed(() =>
  days.value.slice(0, 7).map((day) => format(day, "EEEEE")),
);
const activeWeek = computed(() =>
  props.mode === "week"
    ? new Set(weekDays(props.cursor, props.weekStartsOn).map(dayKey))
    : new Set<string>(),
);
</script>

<template>
  <div class="select-none">
    <div class="mb-2 flex items-center justify-between pl-1">
      <p class="text-sm font-semibold">{{ format(month, "MMMM yyyy") }}</p>
      <div class="flex items-center">
        <Button
          variant="ghost"
          size="icon"
          class="h-7 w-7 text-muted-foreground"
          aria-label="Previous month"
          @click="month = addMonths(month, -1)"
        >
          <ChevronLeftIcon class="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          class="h-7 w-7 text-muted-foreground"
          aria-label="Next month"
          @click="month = addMonths(month, 1)"
        >
          <ChevronRightIcon class="h-4 w-4" />
        </Button>
      </div>
    </div>

    <div class="grid grid-cols-7 text-center">
      <span
        v-for="(letter, index) in weekdayLetters"
        :key="index"
        class="pb-1 text-[11px] font-medium text-muted-foreground"
      >
        {{ letter }}
      </span>
      <div
        v-for="(day, index) in days"
        :key="dayKey(day)"
        :class="
          cn(
            'flex h-8 items-center justify-center',
            activeWeek.has(dayKey(day)) && 'bg-accent',
            activeWeek.has(dayKey(day)) && index % 7 === 0 && 'rounded-l-full',
            activeWeek.has(dayKey(day)) && index % 7 === 6 && 'rounded-r-full',
          )
        "
      >
        <button
          type="button"
          :aria-label="format(day, 'EEEE d MMMM')"
          :aria-current="isToday(day) ? 'date' : undefined"
          :class="
            cn(
              'relative flex h-7 w-7 items-center justify-center rounded-full text-xs tabular-nums transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              !isSameMonth(day, month) && 'text-muted-foreground/50',
              isToday(day) && 'font-semibold text-primary',
              isSameDay(day, cursor) &&
                'bg-primary font-semibold text-primary-foreground hover:bg-primary/90',
            )
          "
          @click="emit('select', day)"
        >
          {{ day.getDate() }}
          <span
            v-if="busyDays.has(dayKey(day)) && !isSameDay(day, cursor)"
            class="absolute bottom-0.5 h-1 w-1 rounded-full bg-primary/70"
          />
        </button>
      </div>
    </div>
  </div>
</template>
