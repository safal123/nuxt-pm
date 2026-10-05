<script setup lang="ts">
import { addMinutes, format } from "date-fns";
import {
  AlignLeftIcon,
  CalendarClockIcon,
  CheckIcon,
  ExternalLinkIcon,
  Loader2Icon,
  MapPinIcon,
  Trash2Icon,
} from "lucide-vue-next";
import { toast } from "vue-sonner";
import { toTypedSchema } from "@vee-validate/zod";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import DatePicker from "@/components/DatePicker.vue";
import type { CalendarEvent, CalendarEventDraft, CalendarEventInput } from "~/types";
import { calendarEventFieldsSchema } from "~/server/utils/schemas";
import { TASK_COLORS } from "~/utils/task-colors";
import {
  CALENDAR_DEFAULT_COLOR,
  combineDayAndTime,
  dateOnlyKey,
  dayDelta,
  dayKey,
  parseDayKey,
  shiftDayKey,
  timeOfDay,
  timeSlots,
} from "~/utils/calendar";

const props = defineProps<{
  open: boolean;
  event: CalendarEvent | null;
  defaults: CalendarEventDraft | null;
}>();

const emit = defineEmits<{ (e: "update:open", value: boolean): void }>();

const calendarStore = useCalendarStore();
const formSchema = toTypedSchema(
  calendarEventFieldsSchema.pick({ title: true, location: true, description: true }),
);
const slots = timeSlots();

const formKey = ref(0);
const initialValues = ref({ title: "", location: "", description: "" });
const allDay = ref(false);
const startDay = ref("");
const startTime = ref("09:00");
const endDay = ref("");
const endTime = ref("10:00");
const color = ref<string>(CALENDAR_DEFAULT_COLOR);
const saving = ref(false);
const deleting = ref(false);
const confirmDelete = ref(false);

const editing = computed(() => Boolean(props.event));
const readOnly = computed(() => Boolean(props.event && props.event.provider !== "LOCAL"));
const busy = computed(() => saving.value || deleting.value);
const providerName = computed(() =>
  props.event?.provider === "GOOGLE" ? "Google Calendar" : "Microsoft Outlook",
);
const sourceCalendar = computed(() =>
  calendarStore.connections.find((item) => item.id === props.event?.connectionId)?.name,
);

const setEnd = (date: Date) => {
  endDay.value = dayKey(date);
  endTime.value = timeOfDay(date);
};

watch(
  () => props.open,
  (open) => {
    if (!open) return;
    saving.value = false;
    deleting.value = false;
    confirmDelete.value = false;
    const event = props.event;
    if (event) {
      initialValues.value = {
        title: event.title,
        location: event.location ?? "",
        description: event.description ?? "",
      };
      allDay.value = event.allDay;
      color.value = event.color ?? CALENDAR_DEFAULT_COLOR;
      if (event.allDay) {
        startDay.value = dateOnlyKey(event.startAt);
        endDay.value = dateOnlyKey(event.endAt);
        startTime.value = "09:00";
        endTime.value = "10:00";
      } else {
        const start = new Date(event.startAt);
        startDay.value = dayKey(start);
        startTime.value = timeOfDay(start);
        setEnd(new Date(event.endAt));
      }
    } else {
      const defaults = props.defaults ?? { day: dayKey(new Date()) };
      initialValues.value = { title: "", location: "", description: "" };
      color.value = CALENDAR_DEFAULT_COLOR;
      allDay.value = defaults.allDay ?? false;
      startDay.value = defaults.day;
      const start = addMinutes(parseDayKey(defaults.day), defaults.startMinutes ?? 9 * 60);
      startTime.value = timeOfDay(start);
      setEnd(addMinutes(start, 60));
      if (allDay.value) endDay.value = defaults.day;
    }
    formKey.value += 1;
  },
  { immediate: true },
);

const startDate = computed(() =>
  startDay.value ? combineDayAndTime(startDay.value, startTime.value) : null,
);
const endDate = computed(() =>
  endDay.value ? combineDayAndTime(endDay.value, endTime.value) : null,
);

const rangeError = computed(() => {
  if (!startDay.value || !endDay.value) return "Pick a start and end date.";
  if (allDay.value) return endDay.value < startDay.value ? "The end date is before the start." : "";
  if (startDate.value && endDate.value && endDate.value <= startDate.value) {
    return "The event must end after it starts.";
  }
  return "";
});

/** Moving the start keeps the event's length, like Google and Outlook. */
const changeStart = (day: string, time: string) => {
  if (!day) return;
  if (allDay.value) {
    const span = startDay.value && endDay.value ? dayDelta(startDay.value, endDay.value) : 0;
    startDay.value = day;
    endDay.value = shiftDayKey(day, Math.max(span, 0));
    return;
  }
  const duration =
    startDate.value && endDate.value && endDate.value > startDate.value
      ? endDate.value.getTime() - startDate.value.getTime()
      : 60 * 60_000;
  startDay.value = day;
  startTime.value = time;
  setEnd(new Date(combineDayAndTime(day, time).getTime() + duration));
};

const onAllDay = (value: boolean) => {
  allDay.value = value;
  if (value && endDay.value < startDay.value) endDay.value = startDay.value;
};

const durationHint = computed(() => {
  if (allDay.value || !startDate.value || !endDate.value || rangeError.value) return "";
  const minutes = Math.round((endDate.value.getTime() - startDate.value.getTime()) / 60_000);
  if (minutes < 60) return `${minutes} min`;
  const hours = minutes / 60;
  return Number.isInteger(hours) ? `${hours} hr` : `${hours.toFixed(1)} hr`;
});

const summaryLabel = computed(() => {
  if (!startDay.value) return "";
  const start = parseDayKey(startDay.value);
  if (allDay.value) {
    return startDay.value === endDay.value || !endDay.value
      ? format(start, "EEEE, d MMMM")
      : `${format(start, "d MMM")} – ${format(parseDayKey(endDay.value), "d MMM yyyy")}`;
  }
  return format(start, "EEEE, d MMMM");
});

const close = () => {
  if (busy.value) return;
  emit("update:open", false);
};

async function onSubmit(values: any) {
  if (busy.value || readOnly.value || rangeError.value) return;
  const payload: CalendarEventInput = {
    title: values.title,
    location: values.location ?? null,
    description: values.description ?? null,
    allDay: allDay.value,
    color: color.value,
    startAt: allDay.value ? startDay.value : startDate.value!.toISOString(),
    endAt: allDay.value ? endDay.value : endDate.value!.toISOString(),
  };
  saving.value = true;
  try {
    if (props.event) {
      await calendarStore.updateEvent(props.event.id, payload);
      toast.success("Event updated");
    } else {
      await calendarStore.createEvent(payload);
      toast.success("Event created", { description: summaryLabel.value });
    }
    emit("update:open", false);
  } catch (error: any) {
    toast.error(error?.data?.message || "Could not save this event.");
  } finally {
    saving.value = false;
  }
}

const removeEvent = async () => {
  if (!props.event || busy.value) return;
  if (!confirmDelete.value) {
    confirmDelete.value = true;
    return;
  }
  deleting.value = true;
  try {
    await calendarStore.deleteEvent(props.event.id);
    toast.success("Event deleted");
    emit("update:open", false);
  } catch (error: any) {
    toast.error(error?.data?.message || "Could not delete this event.");
  } finally {
    deleting.value = false;
  }
};
</script>

<template>
  <Dialog :open="open" @update:open="(value) => { if (!value) close() }">
    <DialogContent class="flex max-h-[90vh] max-w-lg flex-col gap-0 p-0">
      <DialogHeader class="border-b border-border px-6 pb-4 pt-6">
        <div class="flex items-start gap-3">
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-md"
            :style="{ backgroundColor: `${TASK_COLORS.find((item) => item.id === color)?.value ?? '#0079bf'}22` }"
          >
            <CalendarClockIcon
              class="h-5 w-5"
              :style="{ color: TASK_COLORS.find((item) => item.id === color)?.value }"
            />
          </div>
          <div class="space-y-1 text-left">
            <DialogTitle>
              {{ readOnly ? event?.title : editing ? "Edit event" : "New event" }}
            </DialogTitle>
            <DialogDescription>
              {{ summaryLabel }}<template v-if="durationHint"> · {{ durationHint }}</template>
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <div v-if="readOnly" class="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5 text-sm">
        <p class="text-xs text-muted-foreground">
          From {{ providerName }}<template v-if="sourceCalendar"> · {{ sourceCalendar }}</template>.
          Changes are made in {{ providerName }}.
        </p>
        <div v-if="event?.location" class="flex gap-3">
          <MapPinIcon class="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <a
            v-if="/^https?:\/\//.test(event.location)"
            :href="event.location"
            target="_blank"
            rel="noopener"
            class="break-all hover:underline"
          >{{ event.location }}</a>
          <span v-else class="break-words">{{ event.location }}</span>
        </div>
        <div v-if="event?.description" class="flex gap-3">
          <AlignLeftIcon class="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <p class="whitespace-pre-line break-words">{{ event.description }}</p>
        </div>
      </div>

      <Form
        v-else
        :key="formKey"
        v-slot="{ handleSubmit }"
        as=""
        :validation-schema="formSchema"
        :initial-values="initialValues"
      >
        <form
          id="calendarEventForm"
          class="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5"
          @submit="handleSubmit($event, onSubmit)"
        >
          <FormField v-slot="{ componentField }" name="title">
            <FormItem>
              <FormControl>
                <Input
                  v-bind="componentField"
                  placeholder="Add title"
                  class="h-11 border-0 border-b border-border px-0 text-lg font-medium shadow-none focus-visible:ring-0 rounded-none"
                  :disabled="busy || readOnly"
                  autofocus
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>

          <div class="flex items-center justify-between">
            <Label for="event-all-day" class="text-sm font-medium">All day</Label>
            <Switch
              id="event-all-day"
              :checked="allDay"
              :disabled="busy || readOnly"
              @update:checked="onAllDay"
            />
          </div>

          <div class="grid gap-3">
            <div class="grid grid-cols-[1fr_auto] gap-2">
              <DatePicker
                :model-value="startDay"
                placeholder="Start date"
                @update:model-value="changeStart($event, startTime)"
              />
              <Select
                v-if="!allDay"
                :model-value="startTime"
                :disabled="busy || readOnly"
                @update:model-value="(value) => changeStart(startDay, String(value))"
              >
                <SelectTrigger class="h-9 w-[120px]">
                  <SelectValue placeholder="Start" />
                </SelectTrigger>
                <SelectContent class="max-h-64">
                  <SelectItem v-for="slot in slots" :key="slot.value" :value="slot.value">
                    {{ slot.label }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="grid grid-cols-[1fr_auto] gap-2">
              <DatePicker v-model="endDay" placeholder="End date" />
              <Select
                v-if="!allDay"
                :model-value="endTime"
                :disabled="busy || readOnly"
                @update:model-value="(value) => (endTime = String(value))"
              >
                <SelectTrigger class="h-9 w-[120px]">
                  <SelectValue placeholder="End" />
                </SelectTrigger>
                <SelectContent class="max-h-64">
                  <SelectItem v-for="slot in slots" :key="slot.value" :value="slot.value">
                    {{ slot.label }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p v-if="rangeError" class="text-xs font-medium text-destructive">
              {{ rangeError }}
            </p>
          </div>

          <FormField v-slot="{ componentField }" name="location">
            <FormItem>
              <FormControl>
                <div class="relative">
                  <MapPinIcon
                    class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    v-bind="componentField"
                    placeholder="Add location or meeting link"
                    class="pl-9"
                    :disabled="busy || readOnly"
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>

          <FormField v-slot="{ componentField }" name="description">
            <FormItem>
              <FormControl>
                <Textarea
                  v-bind="componentField"
                  rows="3"
                  placeholder="Add notes or an agenda"
                  :disabled="busy || readOnly"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>

          <div class="space-y-2">
            <Label class="text-sm font-medium">Colour</Label>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="item in TASK_COLORS"
                :key="item.id"
                type="button"
                :aria-label="item.name"
                :aria-pressed="color === item.id"
                :disabled="busy || readOnly"
                :class="
                  cn(
                    'flex h-7 w-7 items-center justify-center rounded-full ring-offset-2 ring-offset-background transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none',
                    color === item.id && 'ring-2 ring-foreground/60',
                  )
                "
                :style="{ backgroundColor: item.value }"
                @click="color = item.id"
              >
                <CheckIcon v-if="color === item.id" class="h-3.5 w-3.5 text-white drop-shadow" />
              </button>
            </div>
          </div>
        </form>
      </Form>

      <DialogFooter class="flex-row items-center gap-2 border-t border-border px-6 py-4 sm:justify-between">
        <Button
          v-if="editing && !readOnly"
          type="button"
          variant="ghost"
          size="sm"
          :class="cn('text-destructive hover:text-destructive', confirmDelete && 'bg-destructive/10')"
          :disabled="busy"
          @click="removeEvent"
        >
          <Loader2Icon v-if="deleting" class="h-4 w-4 animate-spin" />
          <Trash2Icon v-else class="h-4 w-4" />
          {{ confirmDelete ? "Confirm delete" : "Delete" }}
        </Button>
        <span v-else />
        <div class="flex items-center gap-2">
          <Button type="button" variant="outline" :disabled="busy" @click="close">
            {{ readOnly ? "Close" : "Cancel" }}
          </Button>
          <Button v-if="readOnly && event?.externalUrl" as-child>
            <a :href="event.externalUrl" target="_blank" rel="noopener">
              Open in {{ providerName }}
              <ExternalLinkIcon class="h-4 w-4" />
            </a>
          </Button>
          <Button
            v-if="!readOnly"
            type="submit"
            form="calendarEventForm"
            :disabled="busy || Boolean(rangeError)"
          >
            <Loader2Icon v-if="saving" class="h-4 w-4 animate-spin" />
            {{ editing ? "Save" : "Create event" }}
          </Button>
        </div>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
