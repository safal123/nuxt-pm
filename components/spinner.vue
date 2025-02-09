<script setup>
const props = defineProps({
  size: {
    type: String,
    default: 'sm' | 'md' | 'lg',
  },
})

const sizeMap = {
  sm: 6,
  md: 12,
  lg: 24,
};

const size = computed(() => sizeMap[props.size || 'lg']);
</script>

<template>
  <div class="flex flex-col justify-center items-center space-y-4">
    <svg
      :width="size"
      :height="size"
      class="animate-spin text-blue-600"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        class="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        stroke-width="2"
      ></circle>
      <path
        class="opacity-75"
        stroke="currentColor"
        stroke-width="2"
        fill="none"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4"
      ></path>
    </svg>

    <p class="text-gray-600">Loading...</p>
  </div>
</template>
