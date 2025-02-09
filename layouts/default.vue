<script setup lang="ts">
import { Loader2 } from 'lucide-vue-next'
import { Toaster } from '@/components/ui/toast'
</script>

<template>
  <ClerkLoading>
    <div class="h-screen flex justify-center items-center">
      <Loader2 class="animate-spin h-16 w-16"/>
    </div>
  </ClerkLoading>
  <ClerkLoaded>
    <Toaster />
    <slot/>
  </ClerkLoaded>
</template>

<style scoped></style>
