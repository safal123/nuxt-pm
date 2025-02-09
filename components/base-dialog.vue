<script setup lang="ts">
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

const props = defineProps({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: false,
  },
  size: {
    type: String,
    default: 'xl',
  },
})

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  '6xl': 'max-w-6xl',
  '7xl': 'max-w-7xl',
  '8xl': 'max-w-8xl',
}
</script>

<template>
  <Dialog>
    <DialogTrigger class="w-full flex">
      <slot name="trigger" />
    </DialogTrigger>
    <DialogContent :class="sizeClasses[size]">
      <DialogHeader>
        <DialogTitle>
          {{ title }}
        </DialogTitle>
        <DialogDescription v-if="description">
          {{ description }}
        </DialogDescription>
      </DialogHeader>
      <slot name="body"/>
      <DialogFooter>
        <slot name="footer"/>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>