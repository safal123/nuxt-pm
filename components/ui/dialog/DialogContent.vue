<script setup lang="ts">
import { cn } from '@/lib/utils'
import { X } from 'lucide-vue-next'
import {
  DialogClose,
  DialogContent,
  type DialogContentEmits,
  type DialogContentProps,
  DialogOverlay,
  DialogPortal,
  useForwardPropsEmits,
} from 'radix-vue'
import { computed, type HTMLAttributes } from 'vue'

const props = defineProps<DialogContentProps & { class?: HTMLAttributes['class']; overlayClass?: HTMLAttributes['class'] }>()
const emits = defineEmits<DialogContentEmits>()

const delegatedProps = computed(() => {
  const { class: _, overlayClass: __, ...delegated } = props

  return delegated
})

const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <DialogPortal>
    <DialogOverlay
      :class="
        cn(
          'fixed inset-0 z-50 bg-black/20 backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          props.overlayClass,
        )
      "
    />
    <DialogContent
      v-bind="forwarded"
      :class="
        cn(
          'fixed left-1/2 top-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-0 rounded-xl border border-border bg-background p-5 shadow-[0_16px_48px_rgba(15,23,42,0.12)] duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-xl',
          props.class,
        )"
    >
      <slot />

      <DialogClose
        class="absolute right-3 top-2.5 flex size-7 items-center justify-center rounded-md border border-border bg-background text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none"
      >
        <X class="size-3.5" />
        <span class="sr-only">Close</span>
      </DialogClose>
    </DialogContent>
  </DialogPortal>
</template>
