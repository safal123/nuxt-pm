<script setup lang="ts">
import { SignInButton } from "@clerk/nuxt/components";
</script>

<template>
  <div
    class="relative isolate overflow-hidden bg-background py-24 sm:py-32"
  >
    <div class="mx-auto max-w-7xl px-6 lg:px-8">
      <div class="mx-auto max-w-2xl text-center">
        <h2
          class="text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
        >
          Boost your productivity today
        </h2>
        <p
          class="mx-auto mt-6 max-w-xl text-lg leading-8 text-muted-foreground"
        >
          Join thousands of teams who have already transformed their project
          management with our platform.
        </p>
        <div class="mt-10 flex items-center justify-center gap-x-6">
          <SignInButton
            class="rounded-md bg-purple-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-purple-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600"
          >
            Get started for free
          </SignInButton>
          <a
            href="#features"
            class="text-sm font-semibold leading-6 text-foreground"
          >
            Learn more <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>
    </div>
    <div
      class="absolute left-1/2 top-0 -z-10 -translate-x-1/2 blur-3xl xl:-top-6"
      aria-hidden="true"
    >
      <div
        class="aspect-[1155/678] w-[72.1875rem] bg-gradient-to-tr from-purple-800 to-purple-300 opacity-30"
      />
    </div>
  </div>
</template>
