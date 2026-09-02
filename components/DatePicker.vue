<script setup lang="ts">
import type { DateValue } from "@internationalized/date";
import {
  DateFormatter,
  getLocalTimeZone,
  parseDate,
} from "@internationalized/date";
import { CalendarIcon } from "lucide-vue-next";
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
  { placeholder: "dd/mm/yyyy" },
);

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
}>();

const open = ref(false);

const df = new DateFormatter("en-AU", {
  day: "2-digit",
  month: "2-digit",
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
</script>

<template>
  <Popover :open="open" :modal="false" @update:open="open = $event">
    <PopoverTrigger as-child>
      <Button
        type="button"
        variant="outline"
        :class="
          cn(
            'w-full justify-start text-left font-normal px-3',
            !date && 'text-muted-foreground',
          )
        "
      >
        <CalendarIcon class="mr-2 h-4 w-4" />
        {{ label }}
      </Button>
    </PopoverTrigger>
    <PopoverContent class="w-auto p-0 z-[100]" align="start">
      <Calendar
        :model-value="date"
        initial-focus
        weekday-format="short"
        @update:model-value="onSelect"
      />
    </PopoverContent>
  </Popover>
</template>
