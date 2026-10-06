<script setup lang="ts">
import { cn } from '@/lib/utils'
import { ChevronRight } from 'lucide-vue-next'
import {
  DropdownMenuSubTrigger,
  type DropdownMenuSubTriggerProps,
  useForwardProps,
} from 'radix-vue'
import { computed, type HTMLAttributes } from 'vue'

const props = defineProps<DropdownMenuSubTriggerProps & { class?: HTMLAttributes['class'] }>()

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props

  return delegated
})

const forwardedProps = useForwardProps(delegatedProps)
</script>

<template>
  <DropdownMenuSubTrigger
    v-bind="forwardedProps"
    :class="cn(
      'flex cursor-default select-none items-center rounded-md gap-2 px-2 py-1.5 text-[13px] outline-none focus:bg-accent data-[state=open]:bg-accent [&>svg]:size-3.5 [&>svg]:shrink-0',
      props.class,
    )"
  >
    <slot />
    <ChevronRight class="ml-auto size-3.5" />
  </DropdownMenuSubTrigger>
</template>
