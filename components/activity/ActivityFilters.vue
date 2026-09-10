<script setup lang="ts">
import type {
  ActivityFilters,
  ActivityProjectOption,
  ActivityTaskOption,
} from "@/types";
import { ALL } from "@/utils/activity";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

defineProps<{
  filters: ActivityFilters;
  projects: ActivityProjectOption[];
  tasks: ActivityTaskOption[];
}>();

const emit = defineEmits<{
  project: [value: string];
  task: [value: string];
  kind: [value: string];
}>();

const emitIfString = (event: "project" | "task" | "kind", value: unknown) => {
  if (typeof value === "string") emit(event, value);
};

const onProject = (value: unknown) => emitIfString("project", value);
const onTask = (value: unknown) => emitIfString("task", value);
const onKind = (value: unknown) => emitIfString("kind", value);
</script>

<template>
  <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
    <Select :model-value="filters.kind" @update:model-value="onKind">
      <SelectTrigger class="h-9 w-full sm:w-[160px]">
        <SelectValue placeholder="All activity" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem :value="ALL">All activity</SelectItem>
          <SelectItem value="task">Board</SelectItem>
          <SelectItem value="email">Emails</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
    <Select :model-value="filters.projectId" @update:model-value="onProject">
      <SelectTrigger class="h-9 w-full sm:w-[200px]">
        <SelectValue placeholder="All projects" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem :value="ALL">All projects</SelectItem>
          <SelectItem
            v-for="project in projects"
            :key="project.id"
            :value="project.id"
          >
            {{ project.name }}
          </SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
    <Select
      :model-value="filters.taskId"
      :disabled="filters.kind === 'email'"
      @update:model-value="onTask"
    >
      <SelectTrigger class="h-9 w-full sm:w-[220px]">
        <SelectValue placeholder="All tasks" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem :value="ALL">All tasks</SelectItem>
          <SelectItem v-for="task in tasks" :key="task.id" :value="task.id">
            {{ task.title }}
          </SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  </div>
</template>
