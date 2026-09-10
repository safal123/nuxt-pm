<script setup lang="ts">
const steps = [
  {
    step: "01",
    title: "Create a workspace",
    body: "Name the workspace, add your first project, and choose board or table as the default view.",
  },
  {
    step: "02",
    title: "Invite the team",
    body: "Send a branded invite. Northstar logs the email, the template, and who sent it — so you can see what went out.",
  },
  {
    step: "03",
    title: "Run the board",
    body: "Move cards, comment, archive what you’re done with, and keep activity in one place instead of a chat thread.",
  },
];
</script>

<template>
  <section id="how-it-works" class="scroll-mt-24 py-20 sm:py-28">
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div class="mx-auto max-w-2xl text-center">
        <p class="text-sm font-medium text-primary">How it works</p>
        <h2 class="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          From empty workspace to a live board.
        </h2>
        <p class="mt-4 text-base leading-7 text-muted-foreground">
          No extra tools. Sign in, pick a workspace, and start from
          the same sidebar your team will use every day.
        </p>
      </div>

      <ol class="mx-auto mt-14 grid max-w-5xl gap-6 sm:grid-cols-3">
        <li
          v-for="item in steps"
          :key="item.step"
          class="relative rounded-xl border border-border bg-card p-6"
        >
          <span class="text-xs font-semibold tracking-widest text-primary">
            {{ item.step }}
          </span>
          <h3 class="mt-3 text-base font-semibold text-foreground">
            {{ item.title }}
          </h3>
          <p class="mt-2 text-sm leading-6 text-muted-foreground">
            {{ item.body }}
          </p>
        </li>
      </ol>
    </div>
  </section>
</template>
