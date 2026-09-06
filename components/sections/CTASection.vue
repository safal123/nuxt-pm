<script setup lang="ts">
import { ArrowRightIcon } from "lucide-vue-next";

const { isSignedIn } = useAuth();
</script>

<template>
  <section class="pb-20 sm:pb-28">
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div
        class="relative overflow-hidden rounded-2xl border border-border bg-card px-6 py-14 text-center sm:px-12"
      >
        <div
          class="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.14),transparent_65%)]"
        />
        <div class="relative">
          <h2 class="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Open a workspace in a minute.
          </h2>
          <p class="mx-auto mt-4 max-w-xl text-base leading-7 text-muted-foreground">
            Sign in, create a project, and you’ll have a board, archive,
            activity, and email log — the same product this page describes.
          </p>
          <div class="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button v-if="isSignedIn" as-child size="lg">
              <NuxtLink to="/w">
                Open dashboard
                <ArrowRightIcon class="h-4 w-4" />
              </NuxtLink>
            </Button>
            <Button v-else as-child size="lg">
              <NuxtLink to="/sign-up">
                Get started
                <ArrowRightIcon class="h-4 w-4" />
              </NuxtLink>
            </Button>
            <Button v-if="!isSignedIn" as-child variant="outline" size="lg">
              <NuxtLink to="/sign-in">Sign in</NuxtLink>
            </Button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
