<script setup lang="ts">
const route = useRoute()
const redirectUrl = computed(() =>
  typeof route.query.redirect_url === 'string' ? route.query.redirect_url : '/dashboard',
)
const clerkAppearance = useClerkAppearance()
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-background">
    <div class="absolute top-4 right-4">
      <ThemeToggle />
    </div>
    <SignUp
      :force-redirect-url="redirectUrl"
      :sign-in-force-redirect-url="redirectUrl"
      :appearance="clerkAppearance"
    />
  </div>
</template>
