<script setup lang="ts">
import type { DateValue } from "@internationalized/date";
import {
  DateFormatter,
  getLocalTimeZone,
  parseDate,
  today,
} from "@internationalized/date";
import { CalendarIcon, XIcon } from "lucide-vue-next";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const props = withDefaults(
  defineProps<{
    modelValue: string;
    placeholder?: string;
  }>(),
  { placeholder: "Pick a date" },
);

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
}>();

const open = ref(false);
const workspaceStore = useWorkspaceStore();
const calendarLocale = computed(() =>
  workspaceStore.activeWorkspace?.settings?.weekStartsOnMonday === false
    ? "en-US"
    : "en-AU",
);

const df = new DateFormatter("en-AU", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const date = computed<DateValue | undefined>(() => {
  if (!props.modelValue) return undefined;
  try {
    return parseDate(props.modelValue);
  } catch {
    return undefined;
  }
});

const label = computed(() => {
  if (!date.value) return props.placeholder;
  return df.format(date.value.toDate(getLocalTimeZone()));
});

const onSelect = (value: DateValue | undefined) => {
  emit("update:modelValue", value ? value.toString() : "");
  if (value) open.value = false;
};

const clear = () => {
  emit("update:modelValue", "");
  open.value = false;
};

const PRESETS = [
  { days: 0, label: "Today" },
  { days: 1, label: "Tomorrow" },
  { days: 7, label: "Next week" },
] as const;

const applyPreset = (days: number) => {
  const next = today(getLocalTimeZone()).add({ days });
  emit("update:modelValue", next.toString());
  open.value = false;
};

const isPreset = (days: number) => {
  if (!date.value) return false;
  const preset = today(getLocalTimeZone()).add({ days });
  return date.value.compare(preset) === 0;
};
</script>

<template>
  <div class="relative">
    <Popover :open="open" :modal="false" @update:open="open = $event">
      <PopoverTrigger as-child>
        <Button
          type="button"
          variant="outline"
          :class="
            cn(
              'h-8 w-full justify-start px-2.5 text-left text-[12px] font-normal',
              date && 'pr-8',
              !date && 'text-muted-foreground',
            )
          "
        >
          <CalendarIcon class="mr-1.5 size-3.5 text-muted-foreground" />
          {{ label }}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        class="z-[100] w-auto overflow-hidden rounded-xl p-0"
        align="start"
      >
        <div class="grid grid-cols-3 gap-1.5 border-b border-border px-3 py-2.5">
          <button
            v-for="preset in PRESETS"
            :key="preset.days"
            type="button"
            class="h-7 rounded-md border px-1.5 text-[11px] font-medium transition-colors"
            :class="
              isPreset(preset.days)
                ? 'border-foreground/20 bg-foreground text-background'
                : 'border-border bg-muted text-muted-foreground hover:bg-accent hover:text-foreground'
            "
            @click="applyPreset(preset.days)"
          >
            {{ preset.label }}
          </button>
        </div>
        <Calendar
          :model-value="date"
          :locale="calendarLocale"
          initial-focus
          weekday-format="short"
          @update:model-value="onSelect"
        />
      </PopoverContent>
    </Popover>
    <button
      v-if="date"
      type="button"
      class="absolute right-1 top-1/2 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      aria-label="Clear date"
      @click.stop="clear"
    >
      <XIcon class="h-3.5 w-3.5" />
    </button>
  </div>
</template>
