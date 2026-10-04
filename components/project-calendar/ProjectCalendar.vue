<script setup lang="ts">
import {
  addDays,
  addMonths,
  addWeeks,
  format,
  isSameMonth,
  isSameYear,
} from "date-fns";
import { useEventListener, useLocalStorage, useNow } from "@vueuse/core";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  Loader2Icon,
  PlusIcon,
} from "lucide-vue-next";
import { toast } from "vue-sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  CalendarEntry,
  CalendarEvent,
  CalendarEventDraft,
  CalendarViewMode,
} from "~/types";
import { colorValue } from "~/utils/task-colors";
import {
  CALENDAR_AGENDA_DAYS,
  CALENDAR_DEFAULT_COLOR,
  CALENDAR_OVERDUE_COLOR,
  CALENDAR_PRIORITY_COLORS,
  dayKey,
  combineDayAndTime,
  dateOnlyKey,
  eventDayKeys,
  groupByDay,
  monthGrid,
  shiftEventToDay,
  visibleRange,
  weekDays,
  type WeekStart,
} from "~/utils/calendar";
import ProjectCalendarAgenda from "./ProjectCalendarAgenda.vue";
import ProjectCalendarEventDialog from "./ProjectCalendarEventDialog.vue";
import ProjectCalendarMiniMonth from "./ProjectCalendarMiniMonth.vue";
import ProjectCalendarMonth from "./ProjectCalendarMonth.vue";
import ProjectCalendarSync from "./ProjectCalendarSync.vue";
import ProjectCalendarWeek from "./ProjectCalendarWeek.vue";

const props = defineProps<{ projectId: string }>();

const MODES: { id: CalendarViewMode; label: string; shortcut: string }[] = [
  { id: "month", label: "Month", shortcut: "M" },
  { id: "week", label: "Week", shortcut: "W" },
  { id: "agenda", label: "Agenda", shortcut: "A" },
];

const SHORTCUTS = [
  { keys: "T", label: "Go to today" },
  { keys: "← →", label: "Previous / next" },
  { keys: "M W A", label: "Month, week, agenda" },
  { keys: "C", label: "New event" },
];

const calendarStore = useCalendarStore();
const boardStore = useBoardStore();
const workspaceStore = useWorkspaceStore();

const mode = useLocalStorage<CalendarViewMode>("project-calendar-mode", "month");
const showEvents = useLocalStorage("project-calendar-show-events", true);
const showTasks = useLocalStorage("project-calendar-show-tasks", true);
const cursor = ref(new Date());
const connectOpen = ref(false);

// Google sends the user back here after granting calendar access.
const route = useRoute();
const router = useRouter();
onMounted(() => {
  const result = route.query.calendarConnect;
  if (!result) return;
  if (result === "google") connectOpen.value = true;
  else toast.error(`Google Calendar was not connected${route.query.error ? `: ${route.query.error}` : "."}`);
  const { calendarConnect: _, error: __, ...query } = route.query;
  router.replace({ query });
});

const weekStartsOn = computed<WeekStart>(() =>
  workspaceStore.activeWorkspace?.settings?.weekStartsOnMonday === false ? 0 : 1,
);

const range = computed(() => visibleRange(mode.value, cursor.value, weekStartsOn.value));
const monthDays = computed(() => monthGrid(cursor.value, weekStartsOn.value));
const weekDayList = computed(() => weekDays(cursor.value, weekStartsOn.value));

const load = async (silent = false) => {
  try {
    await calendarStore.fetchRange(props.projectId, range.value.from, range.value.to, {
      silent,
    });
  } catch (error: any) {
    toast.error(error?.data?.message || "Could not load the calendar.");
  }
};

watch(
  () => [props.projectId, range.value.from.getTime(), range.value.to.getTime()],
  () => load(),
  { immediate: true },
);

const eventEntry = (event: CalendarEvent): CalendarEntry => ({
  key: `event:${event.id}`,
  kind: "event",
  id: event.id,
  title: event.title,
  startAt: event.startAt,
  endAt: event.endAt,
  allDay: event.allDay,
  color: colorValue(event.color ?? CALENDAR_DEFAULT_COLOR),
  done: false,
  overdue: false,
  editable: event.provider === "LOCAL",
  days: eventDayKeys(event),
  event,
});

const now = useNow({ interval: 60_000 });
const todayKey = computed(() => dayKey(now.value));

const entries = computed<CalendarEntry[]>(() => {
  const list: CalendarEntry[] = [];
  if (showEvents.value) list.push(...calendarStore.events.map(eventEntry));
  if (showTasks.value) {
    for (const task of calendarStore.tasks) {
      if (!task.dueDate) continue;
      const due = new Date(task.dueDate).toISOString();
      const dueKey = dateOnlyKey(task.dueDate);
      const done = task.status === "DONE";
      const overdue = !done && dueKey < todayKey.value;
      list.push({
        key: `task:${task.id}`,
        kind: "task",
        id: task.id,
        title: task.title,
        startAt: due,
        endAt: due,
        allDay: true,
        color: overdue
          ? CALENDAR_OVERDUE_COLOR
          : (CALENDAR_PRIORITY_COLORS[task.priority] ?? CALENDAR_PRIORITY_COLORS.MEDIUM),
        done,
        overdue,
        editable: true,
        days: [dueKey],
        task,
      });
    }
  }
  const rank = (entry: CalendarEntry) =>
    entry.kind === "event" && (entry.allDay || entry.days.length > 1) ? 0 : entry.kind === "task" ? 1 : 2;
  return list.sort(
    (a, b) =>
      rank(a) - rank(b) ||
      a.startAt.localeCompare(b.startAt) ||
      Number(a.done) - Number(b.done) ||
      a.title.localeCompare(b.title),
  );
});

const byDay = computed(() => groupByDay(entries.value, (entry) => entry.days));

const layers = computed(() => [
  {
    id: "events",
    label: "Events",
    hint: "Meetings and milestones",
    count: calendarStore.events.length,
    on: showEvents.value,
    color: colorValue(CALENDAR_DEFAULT_COLOR),
    toggle: (value: boolean) => (showEvents.value = value),
  },
  {
    id: "tasks",
    label: "Card due dates",
    hint: "Cards with a due date",
    count: calendarStore.tasks.length,
    on: showTasks.value,
    color: CALENDAR_PRIORITY_COLORS.MEDIUM,
    toggle: (value: boolean) => (showTasks.value = value),
  },
]);

const busyDays = computed(() => new Set(byDay.value.keys()));

const title = computed(() => {
  if (mode.value === "month") return format(cursor.value, "MMMM yyyy");
  const from = mode.value === "week" ? weekDayList.value[0] : range.value.from;
  const to = mode.value === "week" ? weekDayList.value[6] : addDays(range.value.to, -1);
  if (isSameMonth(from, to)) return `${format(from, "d")} – ${format(to, "d MMMM yyyy")}`;
  if (isSameYear(from, to)) return `${format(from, "d MMM")} – ${format(to, "d MMM yyyy")}`;
  return `${format(from, "d MMM yyyy")} – ${format(to, "d MMM yyyy")}`;
});

const step = (direction: 1 | -1) => {
  if (mode.value === "month") cursor.value = addMonths(cursor.value, direction);
  else if (mode.value === "week") cursor.value = addWeeks(cursor.value, direction);
  else cursor.value = addDays(cursor.value, direction * CALENDAR_AGENDA_DAYS);
};

const goToday = () => {
  cursor.value = new Date();
};

const setMode = (value: string | number) => {
  if (MODES.some((item) => item.id === value)) mode.value = value as CalendarViewMode;
};

const dialogOpen = ref(false);
const dialogEvent = ref<CalendarEvent | null>(null);
const dialogDraft = ref<CalendarEventDraft | null>(null);

const openCreate = (draft?: CalendarEventDraft) => {
  dialogEvent.value = null;
  dialogDraft.value = draft ?? { day: format(new Date(), "yyyy-MM-dd") };
  dialogOpen.value = true;
};

const onCreateFromMonth = (day: string) => openCreate({ day, allDay: true });
const onCreateFromWeek = (day: string, startMinutes?: number) =>
  openCreate(startMinutes === undefined ? { day, allDay: true } : { day, startMinutes });

const openEntry = (entry: CalendarEntry) => {
  if (entry.task) {
    void boardStore.openTask(entry.task);
    return;
  }
  if (entry.event) {
    dialogEvent.value = entry.event;
    dialogDraft.value = null;
    dialogOpen.value = true;
  }
};

const moveEntry = async (entry: CalendarEntry, day: string, startMinutes?: number) => {
  try {
    if (entry.task) {
      await calendarStore.rescheduleTask(entry.task.id, day);
      toast.success("Due date moved", { description: format(combineDayAndTime(day, "00:00"), "EEEE, d MMMM") });
      return;
    }
    if (!entry.event) return;
    if (startMinutes !== undefined && !entry.event.allDay) {
      const start = combineDayAndTime(day, "00:00");
      start.setMinutes(startMinutes);
      const duration =
        new Date(entry.event.endAt).getTime() - new Date(entry.event.startAt).getTime();
      await calendarStore.updateEvent(entry.event.id, {
        startAt: start.toISOString(),
        endAt: new Date(start.getTime() + duration).toISOString(),
      });
      return;
    }
    await calendarStore.updateEvent(entry.event.id, shiftEventToDay(entry.event, day));
  } catch (error: any) {
    toast.error(error?.data?.message || "Could not move this item.");
  }
};

// Edits made in the card modal (title, status, due date) land in the calendar too.
watch(
  () => boardStore.selectedTask,
  (task, previous) => {
    if (task) calendarStore.syncTask(task);
    else if (previous) void load(true);
  },
);

useEventListener(window, "keydown", (event: KeyboardEvent) => {
  if (event.metaKey || event.ctrlKey || event.altKey || event.defaultPrevented) return;
  const target = event.target as HTMLElement | null;
  if (target?.closest("input, textarea, select, [contenteditable='true'], [role='dialog'], [role='menu'], [role='listbox']")) {
    return;
  }
  if (dialogOpen.value || boardStore.selectedTask) return;
  const key = event.key.toLowerCase();
  if (key === "t") goToday();
  else if (key === "arrowleft" || key === "k") step(-1);
  else if (key === "arrowright" || key === "j") step(1);
  else if (key === "m") setMode("month");
  else if (key === "w") setMode("week");
  else if (key === "a") setMode("agenda");
  else if (key === "c") openCreate({ day: format(cursor.value, "yyyy-MM-dd") });
  else return;
  event.preventDefault();
});
</script>

<template>
  <div class="flex w-full min-w-0 flex-col">
    <div class="mb-3 flex min-w-0 items-start gap-2">
      <div class="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" class="h-8" title="Today (T)" @click="goToday">
          Today
        </Button>
        <div class="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            class="h-8 w-8"
            aria-label="Previous"
            title="Previous (←)"
            @click="step(-1)"
          >
            <ChevronLeftIcon class="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            class="h-8 w-8"
            aria-label="Next"
            title="Next (→)"
            @click="step(1)"
          >
            <ChevronRightIcon class="h-4 w-4" />
          </Button>
        </div>
        <h2 class="min-w-0 truncate text-lg font-semibold tracking-tight">{{ title }}</h2>
        <Loader2Icon
          v-if="calendarStore.loading"
          class="h-4 w-4 shrink-0 animate-spin text-muted-foreground"
        />

        <div class="ml-auto flex items-center gap-2">
          <Button size="sm" class="h-8" title="New event (C)" @click="openCreate({ day: format(cursor, 'yyyy-MM-dd') })">
            <PlusIcon class="h-4 w-4" />
            New event
          </Button>
          <Tabs :model-value="mode" @update:model-value="setMode">
            <TabsList class="h-8 p-0.5">
              <TabsTrigger
                v-for="item in MODES"
                :key="item.id"
                :value="item.id"
                class="h-7 px-3 text-xs"
                :title="`${item.label} (${item.shortcut})`"
              >
                {{ item.label }}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <ProjectViewTabs />
    </div>

    <div
      class="flex h-[calc(100vh-13rem)] min-h-[560px] overflow-hidden rounded-xl border border-border bg-card shadow-sm"
    >
      <aside
        class="hidden w-[17rem] shrink-0 flex-col overflow-y-auto border-r border-border bg-muted/20 xl:flex"
      >
        <div class="p-4">
          <ProjectCalendarMiniMonth
            :cursor="cursor"
            :mode="mode"
            :week-starts-on="weekStartsOn"
            :busy-days="busyDays"
            @select="(date) => (cursor = date)"
          />
        </div>

        <Separator />

        <section class="space-y-1 p-4">
          <p class="mb-2 text-xs font-semibold text-muted-foreground">On this calendar</p>
          <label
            v-for="item in layers"
            :key="item.id"
            class="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-accent"
          >
            <Checkbox
              :checked="item.on"
              class="border-2"
              :style="{
                borderColor: item.color,
                backgroundColor: item.on ? item.color : undefined,
              }"
              @update:checked="(value: boolean) => item.toggle(value)"
            />
            <span class="min-w-0 flex-1">
              <span class="block text-sm font-medium leading-tight">{{ item.label }}</span>
              <span class="block text-xs text-muted-foreground">{{ item.hint }}</span>
            </span>
            <span
              class="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground"
            >
              {{ item.count }}
            </span>
          </label>
        </section>

        <Separator />

        <ProjectCalendarSync v-model:connect-open="connectOpen" />

        <div class="mt-auto p-4">
          <div class="rounded-lg border border-dashed border-border px-3 py-2.5">
            <p class="mb-1.5 text-xs font-medium">Shortcuts</p>
            <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <template v-for="shortcut in SHORTCUTS" :key="shortcut.keys">
                <dt>
                  <kbd
                    class="rounded border border-border bg-background px-1 font-mono text-[10px] text-foreground"
                  >{{ shortcut.keys }}</kbd>
                </dt>
                <dd>{{ shortcut.label }}</dd>
              </template>
            </dl>
          </div>
        </div>
      </aside>

      <div class="min-w-0 flex-1">
        <ProjectCalendarMonth
          v-if="mode === 'month'"
          :days="monthDays"
          :cursor="cursor"
          :by-day="byDay"
          @create="onCreateFromMonth"
          @open="openEntry"
          @move="moveEntry"
        />
        <ProjectCalendarWeek
          v-else-if="mode === 'week'"
          :days="weekDayList"
          :by-day="byDay"
          @create="onCreateFromWeek"
          @open="openEntry"
          @move="moveEntry"
        />
        <ProjectCalendarAgenda
          v-else
          :from="range.from"
          :by-day="byDay"
          @create="(day) => openCreate({ day })"
          @open="openEntry"
        />
      </div>
    </div>

    <ProjectCalendarEventDialog
      v-model:open="dialogOpen"
      :event="dialogEvent"
      :defaults="dialogDraft"
    />
  </div>
</template>
