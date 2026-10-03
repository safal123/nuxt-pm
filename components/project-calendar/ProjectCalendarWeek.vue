<script setup lang="ts">
import { format, isToday } from "date-fns";
import { useNow } from "@vueuse/core";
import { cn } from "@/lib/utils";
import type { CalendarEntry } from "~/types";
import {
  CALENDAR_SLOT_MINUTES,
  dayDelta,
  dayKey,
  layoutTimedEvents,
  shiftDayKey,
  timeRangeLabel,
} from "~/utils/calendar";
import ProjectCalendarChip from "./ProjectCalendarChip.vue";

const HOUR_PX = 48;
const PX_PER_MINUTE = HOUR_PX / 60;
const MAX_ALL_DAY = 3;

const props = defineProps<{
  days: Date[];
  byDay: Map<string, CalendarEntry[]>;
}>();

const emit = defineEmits<{
  (e: "create", day: string, startMinutes?: number): void;
  (e: "open", entry: CalendarEntry): void;
  (e: "move", entry: CalendarEntry, day: string, startMinutes?: number): void;
}>();

const now = useNow({ interval: 60_000 });
const scroller = ref<HTMLElement | null>(null);
const allDayExpanded = ref(false);

const hours = Array.from({ length: 24 }, (_, hour) => hour);
const hourLabel = (hour: number) =>
  hour === 0 ? "" : format(new Date(2000, 0, 1, hour), "h a");

const isAllDayStrip = (entry: CalendarEntry) => entry.allDay || entry.days.length > 1;

const columns = computed(() =>
  props.days.map((date) => {
    const key = dayKey(date);
    const entries = props.byDay.get(key) ?? [];
    const allDay = entries.filter(isAllDayStrip);
    return {
      date,
      key,
      today: isToday(date),
      allDay,
      timed: layoutTimedEvents(
        entries.filter((entry) => !isAllDayStrip(entry)),
        date,
      ),
    };
  }),
);

const allDayRows = computed(() =>
  Math.max(1, ...columns.value.map((column) => column.allDay.length)),
);
const visibleAllDay = (list: CalendarEntry[]) =>
  allDayExpanded.value || list.length <= MAX_ALL_DAY
    ? list
    : list.slice(0, MAX_ALL_DAY - 1);

const nowTop = computed(
  () => (now.value.getHours() * 60 + now.value.getMinutes()) * PX_PER_MINUTE,
);

onMounted(() => {
  if (!scroller.value) return;
  const focusHour = props.days.some((day) => isToday(day))
    ? Math.max(0, now.value.getHours() - 2)
    : 8;
  scroller.value.scrollTop = focusHour * HOUR_PX;
});

const minutesAt = (event: MouseEvent, column: HTMLElement, grabOffset = 0) => {
  const rect = column.getBoundingClientRect();
  const minutes = (event.clientY - rect.top - grabOffset) / PX_PER_MINUTE;
  const snapped = Math.floor(minutes / CALENDAR_SLOT_MINUTES) * CALENDAR_SLOT_MINUTES;
  return Math.min(Math.max(snapped, 0), 24 * 60 - CALENDAR_SLOT_MINUTES);
};

const onColumnClick = (key: string, event: MouseEvent) => {
  emit("create", key, minutesAt(event, event.currentTarget as HTMLElement));
};

const dragging = ref<CalendarEntry | null>(null);
const dragOrigin = ref<string | null>(null);
const grabOffset = ref(0);
const dropTarget = ref<string | null>(null);

const onDragStart = (entry: CalendarEntry, day: string, event: DragEvent) => {
  if (!entry.editable) return;
  dragging.value = entry;
  dragOrigin.value = day;
  const target = event.currentTarget as HTMLElement | null;
  grabOffset.value = target ? event.clientY - target.getBoundingClientRect().top : 0;
  event.dataTransfer?.setData("text/plain", entry.key);
  if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
};

const onDragEnd = () => {
  dragging.value = null;
  dragOrigin.value = null;
  dropTarget.value = null;
};

const onDropDay = (key: string) => {
  const entry = dragging.value;
  const origin = dragOrigin.value;
  onDragEnd();
  if (!entry || !origin || origin === key) return;
  emit("move", entry, shiftDayKey(entry.days[0], dayDelta(origin, key)));
};

const onDropTimed = (key: string, event: DragEvent) => {
  const entry = dragging.value;
  const offset = grabOffset.value;
  onDragEnd();
  if (!entry) return;
  const timedEvent = entry.kind === "event" && !isAllDayStrip(entry);
  if (!timedEvent) {
    if (entry.days[0] !== key) emit("move", entry, key);
    return;
  }
  emit("move", entry, key, minutesAt(event, event.currentTarget as HTMLElement, offset));
};
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <div class="flex overflow-y-hidden border-b border-border [scrollbar-gutter:stable]">
      <div class="w-14 shrink-0" />
      <div class="grid flex-1 grid-cols-7">
        <div
          v-for="column in columns"
          :key="column.key"
          class="flex flex-col items-center gap-0.5 border-l border-border py-2"
        >
          <span
            :class="
              cn(
                'text-[11px] font-medium uppercase tracking-wide',
                column.today ? 'text-primary' : 'text-muted-foreground',
              )
            "
          >
            {{ format(column.date, "EEE") }}
          </span>
          <span
            :class="
              cn(
                'inline-flex h-8 w-8 items-center justify-center rounded-full text-lg font-semibold tabular-nums',
                column.today && 'bg-primary text-primary-foreground',
              )
            "
          >
            {{ column.date.getDate() }}
          </span>
        </div>
      </div>
    </div>

    <div class="flex overflow-y-hidden border-b border-border [scrollbar-gutter:stable]">
      <div
        class="flex w-14 shrink-0 items-start justify-end px-2 pt-1.5 text-[10px] uppercase text-muted-foreground"
      >
        <button
          v-if="allDayRows > MAX_ALL_DAY"
          type="button"
          class="hover:text-foreground"
          @click="allDayExpanded = !allDayExpanded"
        >
          {{ allDayExpanded ? "Less" : "All day" }}
        </button>
        <span v-else>All day</span>
      </div>
      <div class="grid flex-1 grid-cols-7">
        <div
          v-for="column in columns"
          :key="column.key"
          :class="
            cn(
              'flex min-h-[2.25rem] min-w-0 flex-col gap-0.5 border-l border-border p-1',
              dropTarget === `all:${column.key}` && 'bg-primary/5',
            )
          "
          @click="emit('create', column.key)"
          @dragover.prevent="dropTarget = `all:${column.key}`"
          @drop.prevent="onDropDay(column.key)"
        >
          <ProjectCalendarChip
            v-for="entry in visibleAllDay(column.allDay)"
            :key="entry.key"
            :entry="entry"
            :day="column.key"
            :class="dragging?.key === entry.key && 'opacity-50'"
            @open="emit('open', $event)"
            @dragstart="onDragStart(entry, column.key, $event)"
            @dragend="onDragEnd"
          />
          <button
            v-if="!allDayExpanded && column.allDay.length > MAX_ALL_DAY"
            type="button"
            class="rounded-[5px] px-1.5 text-left text-xs font-medium text-muted-foreground hover:bg-accent"
            @click.stop="allDayExpanded = true"
          >
            {{ column.allDay.length - (MAX_ALL_DAY - 1) }} more
          </button>
        </div>
      </div>
    </div>

    <div ref="scroller" class="relative min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]">
      <div class="flex" :style="{ height: `${24 * HOUR_PX}px` }">
        <div class="relative w-14 shrink-0">
          <span
            v-for="hour in hours"
            :key="hour"
            class="absolute right-2 -translate-y-1/2 text-[10px] tabular-nums text-muted-foreground"
            :style="{ top: `${hour * HOUR_PX}px` }"
          >
            {{ hourLabel(hour) }}
          </span>
        </div>
        <div class="relative grid flex-1 grid-cols-7">
          <div class="pointer-events-none absolute inset-0">
            <div
              v-for="hour in hours"
              :key="hour"
              class="absolute inset-x-0 border-t border-border/70"
              :style="{ top: `${hour * HOUR_PX}px` }"
            />
            <div
              v-for="hour in hours"
              :key="`half-${hour}`"
              class="absolute inset-x-0 border-t border-dashed border-border/40"
              :style="{ top: `${hour * HOUR_PX + HOUR_PX / 2}px` }"
            />
          </div>
          <div
            v-for="column in columns"
            :key="column.key"
            :class="
              cn(
                'relative cursor-pointer border-l border-border',
                column.today && 'bg-primary/[0.03]',
                dropTarget === column.key && 'bg-primary/5',
              )
            "
            @click="onColumnClick(column.key, $event)"
            @dragover.prevent="dropTarget = column.key"
            @drop.prevent="onDropTimed(column.key, $event)"
          >
            <button
              v-for="slot in column.timed"
              :key="slot.item.key"
              type="button"
              :draggable="slot.item.editable"
              :title="slot.item.title"
              :class="
                cn(
                  'absolute overflow-hidden rounded-md border-l-[3px] px-1.5 py-0.5 text-left text-xs shadow-sm ring-1 ring-background transition-[filter] hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:hover:brightness-110',
                  slot.item.editable && 'cursor-grab active:cursor-grabbing',
                  dragging?.key === slot.item.key && 'opacity-50',
                )
              "
              :style="{
                top: `${slot.top * PX_PER_MINUTE}px`,
                height: `${Math.max(slot.height * PX_PER_MINUTE, 18)}px`,
                left: `calc(${(slot.column / slot.columns) * 100}% + 2px)`,
                width: `calc(${100 / slot.columns}% - 4px)`,
                backgroundColor: `color-mix(in srgb, ${slot.item.color} 18%, hsl(var(--background)))`,
                borderLeftColor: slot.item.color,
              }"
              @click.stop="emit('open', slot.item)"
              @dragstart="onDragStart(slot.item, column.key, $event)"
              @dragend="onDragEnd"
            >
              <span class="block truncate font-medium text-foreground">
                {{ slot.item.title }}
              </span>
              <span
                v-if="slot.height >= 45"
                class="block truncate tabular-nums text-muted-foreground"
              >
                {{ timeRangeLabel(new Date(slot.item.startAt), new Date(slot.item.endAt)) }}
              </span>
            </button>
            <div
              v-if="column.today"
              class="pointer-events-none absolute inset-x-0 z-10 flex items-center"
              :style="{ top: `${nowTop}px` }"
            >
              <span class="-ml-1 h-2 w-2 rounded-full bg-red-500" />
              <span class="h-px flex-1 bg-red-500" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
