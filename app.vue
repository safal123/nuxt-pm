<script setup>
import { Toaster } from "vue-sonner";

const { isDark } = useTheme();
const toasterTheme = computed(() => (isDark.value ? "dark" : "light"));
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <Toaster :theme="toasterTheme" rich-colors close-button />
</template>
