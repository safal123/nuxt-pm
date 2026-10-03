<script setup lang="ts">
import { format, isSameMonth, isToday } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { CalendarEntry } from "~/types";
import { dayDelta, dayKey, shiftDayKey } from "~/utils/calendar";
import ProjectCalendarChip from "./ProjectCalendarChip.vue";

const MAX_VISIBLE = 3;

const props = defineProps<{
  days: Date[];
  cursor: Date;
  byDay: Map<string, CalendarEntry[]>;
}>();

const emit = defineEmits<{
  (e: "create", day: string): void;
  (e: "open", entry: CalendarEntry): void;
  (e: "move", entry: CalendarEntry, day: string): void;
}>();

const weekdayLabels = computed(() =>
  props.days.slice(0, 7).map((day) => format(day, "EEE")),
);

const cells = computed(() =>
  props.days.map((date) => {
    const key = dayKey(date);
    const entries = props.byDay.get(key) ?? [];
    return {
      date,
      key,
      entries,
      visible: entries.length > MAX_VISIBLE ? entries.slice(0, MAX_VISIBLE - 1) : entries,
      hidden: entries.length > MAX_VISIBLE ? entries.length - (MAX_VISIBLE - 1) : 0,
      inMonth: isSameMonth(date, props.cursor),
      today: isToday(date),
    };
  }),
);

const dragging = ref<CalendarEntry | null>(null);
const dragOrigin = ref<string | null>(null);
const dropTarget = ref<string | null>(null);

const onDragStart = (entry: CalendarEntry, day: string, event: DragEvent) => {
  if (!entry.editable) return;
  dragging.value = entry;
  dragOrigin.value = day;
  event.dataTransfer?.setData("text/plain", entry.key);
  if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
};

const onDragEnd = () => {
  dragging.value = null;
  dropTarget.value = null;
};

const onDrop = (key: string) => {
  const entry = dragging.value;
  const origin = dragOrigin.value;
  onDragEnd();
  if (!entry || !origin || origin === key) return;
  emit("move", entry, shiftDayKey(entry.days[0], dayDelta(origin, key)));
};
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <div class="grid grid-cols-7 border-b border-border">
      <div
        v-for="label in weekdayLabels"
        :key="label"
        class="px-2 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
      >
        {{ label }}
      </div>
    </div>
    <div class="grid min-h-0 flex-1 grid-cols-7 grid-rows-6">
      <div
        v-for="(cell, index) in cells"
        :key="cell.key"
        :class="
          cn(
            'group/cell relative flex min-h-0 min-w-0 cursor-pointer flex-col gap-0.5 border-border p-1 transition-colors hover:bg-muted/40',
            index % 7 !== 6 && 'border-r',
            index < 35 && 'border-b',
            !cell.inMonth && 'bg-muted/30',
            dropTarget === cell.key && 'bg-primary/5 ring-2 ring-inset ring-primary/40',
          )
        "
        @click="emit('create', cell.key)"
        @dragover.prevent="dropTarget = cell.key"
        @dragleave="dropTarget === cell.key && (dropTarget = null)"
        @drop.prevent="onDrop(cell.key)"
      >
        <div class="flex items-center justify-between px-0.5">
          <span
            :class="
              cn(
                'inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs tabular-nums',
                cell.today
                  ? 'bg-primary font-semibold text-primary-foreground'
                  : cell.inMonth
                    ? 'text-foreground'
                    : 'text-muted-foreground/70',
              )
            "
          >
            {{ cell.date.getDate() === 1 ? format(cell.date, "d MMM") : cell.date.getDate() }}
          </span>
        </div>
        <div class="flex min-h-0 flex-col gap-0.5 overflow-hidden">
          <ProjectCalendarChip
            v-for="entry in cell.visible"
            :key="entry.key"
            :entry="entry"
            :day="cell.key"
            :class="dragging?.key === entry.key && 'opacity-50'"
            @open="emit('open', $event)"
            @dragstart="onDragStart(entry, cell.key, $event)"
            @dragend="onDragEnd"
          />
          <Popover v-if="cell.hidden">
            <PopoverTrigger as-child>
              <button
                type="button"
                class="w-full rounded-[5px] px-1.5 py-0.5 text-left text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                @click.stop
              >
                {{ cell.hidden }} more
              </button>
            </PopoverTrigger>
            <PopoverContent class="w-64 p-2" align="start" @click.stop>
              <p class="px-1.5 pb-2 text-xs font-medium text-muted-foreground">
                {{ format(cell.date, "EEEE, d MMMM") }}
              </p>
              <div class="flex max-h-72 flex-col gap-0.5 overflow-y-auto">
                <ProjectCalendarChip
                  v-for="entry in cell.entries"
                  :key="entry.key"
                  :entry="entry"
                  :day="cell.key"
                  @open="emit('open', $event)"
                />
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  </div>
</template>
