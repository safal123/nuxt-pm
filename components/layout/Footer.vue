<script setup lang="ts">
const year = new Date().getFullYear();
</script>

<template>
  <footer class="border-t border-border bg-background">
    <div
      class="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8"
    >
      <div class="flex items-center gap-2.5">
        <img
          src="/images/logo.png"
          alt=""
          class="h-6 w-6 dark:brightness-0 dark:invert"
        />
        <div>
          <p class="text-sm font-semibold text-foreground">Northstar</p>
          <p class="text-xs text-muted-foreground">
            Boards, activity, and email for product teams.
          </p>
        </div>
      </div>
      <nav class="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
        <a href="#product" class="hover:text-foreground">Product</a>
        <a href="#features" class="hover:text-foreground">Features</a>
        <a href="#how-it-works" class="hover:text-foreground">How it works</a>
        <a href="#pricing" class="hover:text-foreground">Pricing</a>
        <NuxtLink to="/sign-in" class="hover:text-foreground">Sign in</NuxtLink>
      </nav>
      <p class="text-xs text-muted-foreground">
        © {{ year }} Northstar. All rights reserved.
      </p>
    </div>
  </footer>
</template>
