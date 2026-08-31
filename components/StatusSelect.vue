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
import type { TaskStatus } from "@/types";
import { TASK_STATUSES } from "@/utils/task-status";

const props = defineProps<{
  modelValue: TaskStatus;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: TaskStatus): void;
}>();

const onSelect = (value: unknown) => {
  if (typeof value !== "string" || value === props.modelValue) return;
  emit("update:modelValue", value as TaskStatus);
};
</script>

<template>
  <Select :model-value="modelValue" :modal="false" @update:model-value="onSelect">
    <SelectTrigger class="w-full">
      <SelectValue placeholder="Select a status" />
    </SelectTrigger>
    <SelectContent>
      <SelectGroup>
        <SelectLabel>Status</SelectLabel>
        <SelectItem
          v-for="item in TASK_STATUSES"
          :key="item.id"
          :value="item.id"
        >
          {{ item.label }}
        </SelectItem>
      </SelectGroup>
    </SelectContent>
  </Select>
</template>
