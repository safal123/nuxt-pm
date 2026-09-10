<script setup lang="ts">
defineProps<{
  label: string;
  disabled?: boolean;
}>();

const emit = defineEmits<{ (e: "click"): void }>();
</script>

<template>
  <Button
    type="button"
    variant="outline"
    size="lg"
    class="h-11 w-full border-border bg-background text-foreground shadow-sm hover:bg-accent"
    :disabled="disabled"
    @click="emit('click')"
  >
    <svg class="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.86c2.26-2.08 3.6-5.15 3.6-8.81z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.08 7.94-2.92l-3.87-3c-1.07.72-2.44 1.15-4.07 1.15-3.13 0-5.78-2.11-6.72-4.96H1.29v3.09A12 12 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27a7.2 7.2 0 0 1 0-4.54V6.64H1.29a12.01 12.01 0 0 0 0 10.72l3.99-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.29 6.64l3.99 3.09C6.22 6.86 8.87 4.75 12 4.75z"
      />
    </svg>
    {{ label }}
  </Button>
</template>
