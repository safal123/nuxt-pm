<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'
import { AvatarFallback, type AvatarFallbackProps } from 'radix-vue'
import { computed } from 'vue'

const props = defineProps<AvatarFallbackProps & { class?: HTMLAttributes['class'] }>()

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props
  return delegated
})
</script>

<template>
  <AvatarFallback
    v-bind="delegatedProps"
    :class="cn('flex h-full w-full items-center justify-center', props.class)"
  >
    <slot />
  </AvatarFallback>
</template>
