<script setup lang="ts">
import type { DateValue } from "@internationalized/date";
import {
  DateFormatter,
  getLocalTimeZone,
  parseDate,
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
              'h-9 w-full justify-start px-3 text-left font-normal',
              date && 'pr-9',
              !date && 'text-muted-foreground',
            )
          "
        >
          <CalendarIcon class="mr-2 h-4 w-4 text-muted-foreground" />
          {{ label }}
        </Button>
      </PopoverTrigger>
      <PopoverContent class="w-auto p-0 z-[100]" align="start">
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
      class="absolute right-1.5 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      aria-label="Clear date"
      @click.stop="clear"
    >
      <XIcon class="h-3.5 w-3.5" />
    </button>
  </div>
</template>
