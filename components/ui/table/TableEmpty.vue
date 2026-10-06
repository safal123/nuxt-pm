<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'
import { computed } from 'vue'
import TableCell from './TableCell.vue'
import TableRow from './TableRow.vue'

const props = withDefaults(defineProps<{
  class?: HTMLAttributes['class']
  colspan?: number
}>(), {
  colspan: 1,
})

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props

  return delegated
})
</script>

<template>
  <TableRow>
    <TableCell
      :class="
        cn(
          'px-3 py-2 whitespace-nowrap align-middle text-[12px] text-foreground',
          props.class,
        )
      "
      v-bind="delegatedProps"
    >
      <div class="flex items-center justify-center py-8">
        <slot />
      </div>
    </TableCell>
  </TableRow>
</template>
