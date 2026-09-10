<script setup lang="ts">
import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationEllipsis,
  PaginationFirst,
  PaginationLast,
  PaginationList,
  PaginationListItem,
  PaginationNext,
  PaginationPrev,
} from "@/components/ui/pagination";

defineProps<{
  page: number;
  total: number;
  pageSize: number;
  rangeLabel: string;
}>();

const emit = defineEmits<{
  "update:page": [value: number];
}>();
</script>

<template>
  <div
    v-if="total"
    class="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
  >
    <p class="text-sm text-muted-foreground">{{ rangeLabel }}</p>
    <Pagination
      v-if="total > pageSize"
      v-slot="{ page: currentPage }"
      :page="page"
      :total="total"
      :items-per-page="pageSize"
      :sibling-count="1"
      show-edges
      @update:page="emit('update:page', $event)"
    >
      <PaginationList v-slot="{ items }" class="flex items-center gap-1">
        <PaginationFirst />
        <PaginationPrev />
        <template v-for="(item, index) in items" :key="index">
          <PaginationListItem
            v-if="item.type === 'page'"
            :value="item.value"
            as-child
          >
            <Button
              class="h-8 w-8 p-0"
              :variant="item.value === currentPage ? 'default' : 'outline'"
            >
              {{ item.value }}
            </Button>
          </PaginationListItem>
          <PaginationEllipsis v-else :index="index" />
        </template>
        <PaginationNext />
        <PaginationLast />
      </PaginationList>
    </Pagination>
  </div>
</template>
