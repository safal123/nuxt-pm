<script setup lang="ts">
import type { SelectLabelProps } from 'radix-vue'
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'
import { SelectLabel } from 'radix-vue'

const props = defineProps<SelectLabelProps & { class?: HTMLAttributes['class'] }>()
</script>

<template>
  <SelectLabel :class="cn('px-2 py-1 text-[12px] font-medium text-muted-foreground', props.class)">
    <slot />
  </SelectLabel>
</template>
