<script setup lang="ts">
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TaskPriority } from "@/types";
import { TASK_PRIORITIES } from "@/utils/task-priority";

const props = defineProps<{
  modelValue: TaskPriority;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: TaskPriority): void;
}>();

const onSelect = (value: unknown) => {
  if (typeof value !== "string" || value === props.modelValue) return;
  emit("update:modelValue", value as TaskPriority);
};
</script>

<template>
  <Select :model-value="modelValue" :modal="false" @update:model-value="onSelect">
    <SelectTrigger class="w-full">
      <SelectValue placeholder="Select a priority" />
    </SelectTrigger>
    <SelectContent>
      <SelectGroup>
        <SelectLabel>Priority</SelectLabel>
        <SelectItem
          v-for="item in TASK_PRIORITIES"
          :key="item.id"
          :value="item.id"
        >
          {{ item.label }}
        </SelectItem>
      </SelectGroup>
    </SelectContent>
  </Select>
</template>
