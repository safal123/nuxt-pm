<script setup lang="ts">
import type { WorkspaceActivity } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

defineProps<{
  activities: WorkspaceActivity[];
  loading: boolean;
  error: string | null;
  page: number;
  total: number;
  pageSize: number;
  rangeLabel: string;
}>();

const emit = defineEmits<{
  select: [activity: WorkspaceActivity];
  retry: [];
  "update:page": [value: number];
}>();
</script>

<template>
  <div class="overflow-hidden rounded-xl border border-border bg-card">
    <Table>
      <TableHeader>
        <TableRow class="hover:bg-transparent border-border">
          <TableHead class="h-10 min-w-[280px]">Activity</TableHead>
          <TableHead class="h-10">On</TableHead>
          <TableHead class="h-10">Project</TableHead>
          <TableHead class="h-10 w-[140px]">Type</TableHead>
          <TableHead class="h-10 w-[140px]">When</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableEmpty v-if="error" :colspan="5">
          <div class="flex flex-col items-center gap-2 py-2">
            <span class="text-muted-foreground">{{ error }}</span>
            <Button type="button" variant="outline" size="sm" @click="emit('retry')">
              Try again
            </Button>
          </div>
        </TableEmpty>
        <TableEmpty v-else-if="loading && !activities.length" :colspan="5">
          <span class="text-muted-foreground">Loading activity…</span>
        </TableEmpty>
        <TableEmpty v-else-if="!activities.length" :colspan="5">
          <span class="text-muted-foreground">No activity matches these filters.</span>
        </TableEmpty>
        <template v-else>
          <ActivityRow
            v-for="item in activities"
            :key="item.id"
            :activity="item"
            @click="emit('select', item)"
          />
        </template>
      </TableBody>
    </Table>

    <TablePagination
      :page="page"
      :total="total"
      :page-size="pageSize"
      :range-label="rangeLabel"
      @update:page="emit('update:page', $event)"
    />
  </div>
</template>
