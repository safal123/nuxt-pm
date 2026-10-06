<script setup lang="ts">
import { addDays, format, isToday, isTomorrow } from "date-fns";
import {
  AlertCircleIcon,
  CalendarPlusIcon,
  CheckCircle2Icon,
  ChevronRightIcon,
  Columns3Icon,
  MapPinIcon,
  RepeatIcon,
} from "lucide-vue-next";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { CalendarEntry, Member } from "~/types";
import { priorityChip, priorityLabel } from "~/utils/task-priority";
import {
  CALENDAR_AGENDA_DAYS,
  CALENDAR_OVERDUE_COLOR,
  dayKey,
  tint,
} from "~/utils/calendar";

const props = defineProps<{
  from: Date;
  byDay: Map<string, CalendarEntry[]>;
}>();

const emit = defineEmits<{
  (e: "create", day: string): void;
  (e: "open", entry: CalendarEntry): void;
}>();

const to = computed(() => addDays(props.from, CALENDAR_AGENDA_DAYS - 1));

const groups = computed(() =>
  Array.from({ length: CALENDAR_AGENDA_DAYS }, (_, index) => addDays(props.from, index))
    .map((date) => ({ date, key: dayKey(date), entries: props.byDay.get(dayKey(date)) ?? [] }))
    .filter((group) => group.entries.length),
);

const stats = computed(() => {
  const seen = new Set<string>();
  let events = 0;
  let due = 0;
  let overdue = 0;
  for (const group of groups.value) {
    for (const entry of group.entries) {
      if (seen.has(entry.key)) continue;
      seen.add(entry.key);
      if (entry.kind === "event") events += 1;
      else if (entry.overdue) overdue += 1;
      else due += 1;
    }
  }
  return { events, due, overdue };
});

const dayTitle = (date: Date) =>
  isToday(date) ? "Today" : isTomorrow(date) ? "Tomorrow" : format(date, "EEEE");

const timeLines = (entry: CalendarEntry, key: string): [string, string] => {
  if (entry.kind === "task") {
    if (entry.done) return ["Done", "Card"];
    return entry.overdue ? ["Overdue", "Card"] : ["Due", "Card"];
  }
  if (entry.allDay) return ["All day", entry.days.length > 1 ? `Day ${entry.days.indexOf(key) + 1} of ${entry.days.length}` : ""];
  const start = new Date(entry.startAt);
  const end = new Date(entry.endAt);
  if (entry.days.length > 1) {
    if (entry.days[0] === key) return [format(start, "h:mm a"), "Starts"];
    if (entry.days[entry.days.length - 1] === key) return [format(end, "h:mm a"), "Ends"];
    return ["All day", "Continues"];
  }
  return [format(start, "h:mm a"), format(end, "h:mm a")];
};

const people = (entry: CalendarEntry): Member[] => {
  if (entry.event) return entry.event.creator ? [entry.event.creator] : [];
  const task = entry.task;
  if (!task) return [];
  const list = task.members?.length ? task.members : task.assignee ? [task.assignee] : [];
  return list.slice(0, 3);
};

const initials = (person: Member) =>
  (person.name || person.email || "?")
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
</script>

<template>
  <div class="relative h-full min-h-0 overflow-y-auto">
    <div
      class="sticky top-0 z-20 flex h-10 items-center gap-2.5 border-b border-border bg-card/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-card/80"
    >
      <div class="min-w-0">
        <p class="text-[13px] font-semibold leading-tight tracking-tight">
          Next {{ CALENDAR_AGENDA_DAYS }} days
        </p>
        <p class="text-[11px] text-muted-foreground">
          {{ format(from, "d MMM") }} – {{ format(to, "d MMM yyyy") }}
        </p>
      </div>
      <div class="ml-auto flex flex-wrap items-center justify-end gap-1 text-[11px]">
        <span class="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 font-medium">
          <span class="size-1.5 rounded-full bg-[#0079bf]" />
          {{ stats.events }} {{ stats.events === 1 ? "event" : "events" }}
        </span>
        <span class="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 font-medium">
          <span class="size-1.5 rounded-full bg-[#14b8a6]" />
          {{ stats.due }} due
        </span>
        <span
          v-if="stats.overdue"
          class="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2 py-0.5 font-medium text-red-700 dark:bg-red-950/50 dark:text-red-300"
        >
          <AlertCircleIcon class="size-3" />
          {{ stats.overdue }} overdue
        </span>
      </div>
    </div>

    <div
      v-if="!groups.length"
      class="flex min-h-[calc(100%-2.5rem)] flex-col items-center justify-center gap-3 px-4 py-12 text-center"
    >
      <div class="flex size-10 items-center justify-center rounded-xl bg-muted">
        <CalendarPlusIcon class="size-4 text-muted-foreground" />
      </div>
      <div class="space-y-0.5">
        <p class="text-[13px] font-semibold tracking-tight">A clear runway</p>
        <p class="max-w-xs text-[12px] text-muted-foreground">
          No events or due cards in the next {{ CALENDAR_AGENDA_DAYS }} days. Plan a
          meeting or milestone to get started.
        </p>
      </div>
      <Button variant="outline" @click="emit('create', dayKey(from))">New event</Button>
    </div>

    <section v-for="group in groups" :key="group.key">
      <header
        class="sticky top-10 z-10 flex items-center gap-2.5 border-b border-border bg-card/95 px-3 py-1.5 backdrop-blur supports-[backdrop-filter]:bg-card/85"
      >
        <div
          :class="
            cn(
              'flex w-9 shrink-0 flex-col items-center overflow-hidden rounded-md border text-center leading-none',
              isToday(group.date)
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background',
            )
          "
        >
          <span
            :class="
              cn(
                'w-full py-px text-[9px] font-medium uppercase tracking-wider',
                isToday(group.date) ? 'bg-black/10' : 'bg-muted text-muted-foreground',
              )
            "
          >
            {{ format(group.date, "MMM") }}
          </span>
          <span class="py-0.5 text-[13px] font-semibold tabular-nums">{{ group.date.getDate() }}</span>
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-[13px] font-semibold leading-tight tracking-tight">
            {{ dayTitle(group.date) }}
          </p>
          <p class="text-[11px] text-muted-foreground">{{ format(group.date, "EEEE, d MMMM") }}</p>
        </div>
        <span class="text-[11px] tabular-nums text-muted-foreground">
          {{ group.entries.length }} {{ group.entries.length === 1 ? "item" : "items" }}
        </span>
      </header>

      <ul class="space-y-0.5 px-2 py-1.5">
        <li v-for="entry in group.entries" :key="entry.key">
          <button
            type="button"
            class="group/row grid w-full grid-cols-[4.75rem_auto_minmax(0,1fr)_auto] items-stretch gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:grid-cols-[5.5rem_auto_minmax(0,1fr)_auto]"
            @click="emit('open', entry)"
          >
            <span class="flex flex-col justify-center text-[11px] tabular-nums">
              <span
                :class="
                  cn(
                    'font-semibold',
                    entry.overdue ? 'text-red-600 dark:text-red-400' : 'text-foreground',
                  )
                "
              >
                {{ timeLines(entry, group.key)[0] }}
              </span>
              <span class="text-muted-foreground">{{ timeLines(entry, group.key)[1] }}</span>
            </span>

            <span
              class="w-1 rounded-full"
              :style="{ backgroundColor: entry.done ? tint(entry.color, 35) : entry.color }"
            />

            <span class="min-w-0 space-y-0.5">
              <span class="flex min-w-0 items-center gap-1.5">
                <CheckCircle2Icon
                  v-if="entry.done"
                  class="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400"
                />
                <span
                  :class="
                    cn(
                      'truncate text-[13px] font-medium',
                      entry.done && 'text-muted-foreground line-through',
                    )
                  "
                >
                  {{ entry.title }}
                </span>
                <span
                  class="shrink-0 rounded px-1.5 py-px text-[10px] font-medium uppercase tracking-wide"
                  :style="{
                    backgroundColor: tint(entry.overdue ? CALENDAR_OVERDUE_COLOR : entry.color, 14),
                    color: `color-mix(in srgb, ${entry.color} 75%, currentColor)`,
                  }"
                >
                  {{ entry.kind === "event" ? "Event" : "Due" }}
                </span>
              </span>
              <span class="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-muted-foreground">
                <template v-if="entry.event">
                  <span v-if="entry.event.location" class="inline-flex min-w-0 items-center gap-1">
                    <MapPinIcon class="size-3 shrink-0" />
                    <span class="truncate">{{ entry.event.location }}</span>
                  </span>
                  <span
                    v-if="entry.event.provider !== 'LOCAL'"
                    class="inline-flex items-center gap-1"
                  >
                    <RepeatIcon class="size-3" />
                    Synced
                  </span>
                  <span v-if="entry.event.description" class="line-clamp-1 max-w-md">
                    {{ entry.event.description }}
                  </span>
                </template>
                <template v-else-if="entry.task">
                  <span v-if="entry.task.columnName" class="inline-flex items-center gap-1">
                    <Columns3Icon class="size-3" />
                    {{ entry.task.columnName }}
                  </span>
                  <span
                    :class="
                      cn(
                        'rounded px-1.5 py-px text-[10px] font-medium ring-1 ring-inset',
                        priorityChip(entry.task.priority),
                      )
                    "
                  >
                    {{ priorityLabel(entry.task.priority) }}
                  </span>
                </template>
              </span>
            </span>

            <span class="flex items-center gap-1.5">
              <span v-if="people(entry).length" class="flex -space-x-1">
                <Avatar
                  v-for="person in people(entry)"
                  :key="person.id"
                  class="size-5 border-2 border-card"
                  :title="person.name || person.email"
                >
                  <AvatarImage v-if="person.imageUrl" :src="person.imageUrl" :alt="person.name || ''" />
                  <AvatarFallback class="bg-muted text-[8px] font-medium">{{ initials(person) }}</AvatarFallback>
                </Avatar>
              </span>
              <ChevronRightIcon
                class="size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover/row:opacity-100"
              />
            </span>
          </button>
        </li>
      </ul>
    </section>
  </div>
</template>
