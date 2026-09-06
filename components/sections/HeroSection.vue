<script setup lang="ts">
import { ArrowRightIcon, CheckIcon } from "lucide-vue-next";

const { isSignedIn } = useAuth();

const highlights = [
  "Kanban and table on every project",
  "Archive and restore instead of losing work",
  "Activity and sent email in one workspace",
];
</script>

<template>
  <section class="relative isolate overflow-hidden pt-24 sm:pt-28">
    <div
      class="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.12),transparent_55%)]"
    />
    <div
      class="pointer-events-none absolute inset-0 -z-10 opacity-[0.35] [background-image:radial-gradient(hsl(var(--foreground)/0.12)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:linear-gradient(to_bottom,black,transparent)]"
    />

    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div class="mx-auto max-w-3xl text-center">
        <p
          class="inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm"
        >
          <span class="h-1.5 w-1.5 rounded-full bg-primary" />
          Workspaces for product teams
        </p>
        <h1
          class="mt-6 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1]"
        >
          Every board, update, and email —
          <span class="text-primary">in one workspace.</span>
        </h1>
        <p
          class="mx-auto mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8"
        >
          Northstar is the place your team runs projects: drag-and-drop boards,
          a table view, archive instead of delete, a full activity feed, and
          branded email you can actually track.
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
          <Button as-child variant="outline" size="lg">
            <a href="#product">See the product</a>
          </Button>
        </div>
        <ul
          class="mt-8 flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground sm:flex-row sm:gap-6"
        >
          <li
            v-for="item in highlights"
            :key="item"
            class="flex items-center gap-2"
          >
            <CheckIcon class="h-4 w-4 text-primary" />
            {{ item }}
          </li>
        </ul>
      </div>

      <div class="relative mx-auto mt-14 max-w-5xl pb-8">
        <div
          class="pointer-events-none absolute -inset-x-10 -bottom-8 -top-4 -z-10 rounded-[2rem] bg-gradient-to-b from-violet-500/15 via-transparent to-transparent blur-2xl"
        />
        <LandingBoardPreview />
      </div>
    </div>
  </section>
</template>
