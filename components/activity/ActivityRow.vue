<script setup lang="ts">
import type { WorkspaceActivity } from "@/types";
import { activityTypeLabel, personInitials } from "@/utils/activity";
import { activityTypeChip, whenChip } from "@/utils/table-chips";
import { whenDate } from "@/utils/date";
import {
  TableCell,
  TableRow,
} from "@/components/ui/table";

defineProps<{
  activity: WorkspaceActivity;
}>();

defineEmits<{
  click: [];
}>();

const when = whenDate;
</script>

<template>
  <TableRow class="cursor-pointer" @click="$emit('click')">
    <TableCell class="py-3">
      <div class="flex min-w-0 items-start gap-3">
        <div
          class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-violet-100 text-[11px] font-semibold text-violet-700 dark:bg-violet-500/20 dark:text-violet-300"
        >
          <img
            v-if="activity.user.imageUrl"
            :src="activity.user.imageUrl"
            class="h-full w-full object-cover"
          />
          <span v-else>{{ personInitials(activity.user) }}</span>
        </div>
        <p class="min-w-0 text-sm leading-5">
          <span class="font-semibold text-foreground">{{
            activity.user.name || activity.user.email
          }}</span>{{ " " }}<span class="text-muted-foreground">{{
            activity.message
          }}</span>
        </p>
      </div>
    </TableCell>
    <TableCell class="max-w-[220px] truncate text-sm text-foreground">
      {{
        activity.email?.subject ||
        activity.task?.title ||
        activity.project?.name ||
        "—"
      }}
    </TableCell>
    <TableCell class="max-w-[180px] truncate text-sm text-muted-foreground">
      {{ activity.project?.name || "Workspace" }}
    </TableCell>
    <TableCell>
      <span :class="activityTypeChip(activity.type)">
        {{ activityTypeLabel(activity.type) }}
      </span>
    </TableCell>
    <TableCell class="whitespace-nowrap" :title="when(activity.createdAt).title">
      <span :class="whenChip(activity.createdAt)">
        {{ when(activity.createdAt).label }}
      </span>
    </TableCell>
  </TableRow>
</template>
