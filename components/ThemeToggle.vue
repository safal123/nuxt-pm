<script setup lang="ts">
import { MoonIcon, SunIcon } from "lucide-vue-next";

const { toggleTheme } = useTheme();
</script>

<template>
  <Button
    type="button"
    variant="outline"
    size="icon"
    class="relative shrink-0"
    aria-label="Toggle theme"
    @click="toggleTheme"
  >
    <SunIcon class="h-4 w-4 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
    <MoonIcon class="absolute h-4 w-4 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
  </Button>
</template>
