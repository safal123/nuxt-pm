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

const props = defineProps<DialogContentProps & { class?: HTMLAttributes['class'] }>()
const emits = defineEmits<DialogContentEmits>()

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props

  return delegated
})

const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <DialogPortal>
    <DialogOverlay
      class="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/20 backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
    >
      <DialogContent
        :class="
          cn(
            'relative z-50 my-8 grid w-full max-w-lg gap-0 rounded-xl border border-border bg-background p-5 shadow-[0_16px_48px_rgba(15,23,42,0.12)] duration-200 sm:rounded-xl md:w-full',
            props.class,
          )
        "
        v-bind="forwarded"
        @pointer-down-outside="(event) => {
          const originalEvent = event.detail.originalEvent;
          const target = originalEvent.target as HTMLElement;
          if (originalEvent.offsetX > target.clientWidth || originalEvent.offsetY > target.clientHeight) {
            event.preventDefault();
          }
        }"
      >
        <slot />

        <DialogClose
          class="absolute right-3 top-2.5 flex size-7 items-center justify-center rounded-md border border-border bg-background text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none"
        >
          <X class="size-3.5" />
          <span class="sr-only">Close</span>
        </DialogClose>
      </DialogContent>
    </DialogOverlay>
  </DialogPortal>
</template>
