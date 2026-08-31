<script setup lang="ts">
import { Loader2 } from "lucide-vue-next";
</script>

<template>
  <ClerkLoading>
    <div class="h-screen flex justify-center items-center bg-background">
      <Loader2 class="animate-spin h-16 w-16 text-muted-foreground" />
    </div>
  </ClerkLoading>
  <ClerkLoaded>
    <slot />
  </ClerkLoaded>
</template>
