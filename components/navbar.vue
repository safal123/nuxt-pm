<script setup lang="ts">
const { isSignedIn } = useAuth();
</script>

<template>
  <header>
    <div class="border-b mx-auto h-16 box-shadow bg-background">
      <div class="container flex justify-between items-center h-full">
        <div class="flex items-center">
          <nuxt-link to="/" class="text-xl font-bold">Nuxt Auth</nuxt-link>
        </div>

        <AppUserButton v-if="isSignedIn" />
        <Button v-else as-child>
          <NuxtLink to="/sign-in">Sign in</NuxtLink>
        </Button>
      </div>
    </div>
  </header>
</template>
