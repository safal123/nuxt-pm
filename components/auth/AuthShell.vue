<script setup lang="ts">
import { CheckIcon } from "lucide-vue-next";

defineProps<{
  title: string;
  subtitle: string;
}>();

const highlights = [
  "Kanban and table on every project",
  "Archive and restore instead of losing work",
  "Activity and sent email in one workspace",
];
</script>

<template>
  <div class="grid min-h-screen lg:grid-cols-2">
    <aside
      class="relative hidden overflow-hidden bg-zinc-950 text-zinc-50 lg:flex lg:flex-col"
    >
      <div
        class="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,hsl(262_83%_58%/0.38),transparent_55%)]"
      />
      <div
        class="pointer-events-none absolute inset-0 opacity-[0.18] [background-image:radial-gradient(#fff_1px,transparent_1px)] [background-size:22px_22px]"
      />

      <div class="relative z-10 flex h-full flex-col justify-between p-10">
        <NuxtLink to="/" class="inline-flex items-center gap-2.5">
          <img
            src="/images/logo.png"
            alt=""
            class="h-7 w-7 brightness-0 invert"
          />
          <span class="text-[15px] font-semibold tracking-tight">
            Northstar
          </span>
        </NuxtLink>

        <div class="max-w-md">
          <p
            class="text-xs font-medium uppercase tracking-[0.18em] text-violet-300"
          >
            Product teams
          </p>
          <h2
            class="mt-4 text-4xl font-semibold tracking-tight text-white xl:text-[2.6rem] xl:leading-[1.15]"
          >
            Every board, update, and email in one workspace.
          </h2>
          <ul class="mt-8 space-y-3">
            <li
              v-for="item in highlights"
              :key="item"
              class="flex items-start gap-3 text-sm leading-6 text-zinc-300"
            >
              <span
                class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-violet-300"
              >
                <CheckIcon class="h-3 w-3" />
              </span>
              {{ item }}
            </li>
          </ul>
        </div>

        <p class="text-xs text-zinc-500">
          Sign in to pick up the board, the activity feed, and the emails you
          already sent.
        </p>
      </div>
    </aside>

    <div class="relative flex min-h-screen flex-col bg-background">
      <div
        class="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.08),transparent_55%)] lg:hidden"
      />

      <header
        class="flex items-center justify-between px-4 py-4 sm:px-6 lg:justify-end"
      >
        <NuxtLink to="/" class="inline-flex items-center gap-2.5 lg:invisible">
          <img
            src="/images/logo.png"
            alt=""
            class="h-7 w-7 dark:brightness-0 dark:invert"
          />
          <span class="text-[15px] font-semibold tracking-tight text-foreground">
            Northstar
          </span>
        </NuxtLink>
        <ThemeToggle />
      </header>

      <div class="flex flex-1 items-center justify-center px-4 py-8 sm:px-6">
        <div class="w-full max-w-[400px] space-y-6">
          <div class="space-y-2">
            <h1 class="text-2xl font-semibold tracking-tight text-foreground">
              {{ title }}
            </h1>
            <p class="text-sm leading-6 text-muted-foreground">{{ subtitle }}</p>
          </div>

          <slot />
        </div>
      </div>
    </div>
  </div>
</template>
