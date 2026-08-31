<script setup lang="ts">
import { MoonIcon, SunIcon } from "lucide-vue-next";

const { isDark, toggleTheme } = useTheme();
</script>

<template>
  <ClientOnly>
    <Button
      type="button"
      variant="outline"
      size="icon"
      class="shrink-0"
      :aria-label="isDark ? 'Switch to light theme' : 'Switch to dark theme'"
      @click="toggleTheme"
    >
      <SunIcon v-if="isDark" class="h-4 w-4" />
      <MoonIcon v-else class="h-4 w-4" />
    </Button>
    <template #fallback>
      <Button
        type="button"
        variant="outline"
        size="icon"
        class="shrink-0"
        aria-label="Toggle theme"
        disabled
      >
        <SunIcon class="h-4 w-4" />
      </Button>
    </template>
  </ClientOnly>
</template>
