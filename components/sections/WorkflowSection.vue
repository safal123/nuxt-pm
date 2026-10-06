<script setup lang="ts">
const steps = [
  {
    step: "1",
    title: "Create a workspace",
    body: "Name it, add a project, and choose board or table as the default view.",
  },
  {
    step: "2",
    title: "Invite the team",
    body: "Send an invite. Northstar stores the email, the template, and who sent it.",
  },
  {
    step: "3",
    title: "Run the board",
    body: "Move cards, comment, archive finished work, and keep the history next to it.",
  },
];
</script>

<template>
  <section id="how-it-works" class="scroll-mt-24 py-20 sm:py-24">
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div class="max-w-xl">
        <h2 class="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          From an empty workspace to a live board
        </h2>
        <p class="mt-3 text-base leading-7 text-muted-foreground">
          Sign in and use the same sidebar your team will use every day.
        </p>
      </div>

      <ol class="mt-12 grid gap-10 border-t border-border pt-10 sm:grid-cols-3 sm:gap-8">
        <li v-for="item in steps" :key="item.step">
          <p class="text-sm tabular-nums text-muted-foreground">{{ item.step }}</p>
          <h3 class="mt-3 text-[15px] font-semibold text-foreground">
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
