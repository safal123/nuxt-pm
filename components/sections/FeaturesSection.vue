<script setup lang="ts">
const features = [
  {
    title: "Board and table",
    description:
      "Each project is a kanban board and a table of the same cards. Switch views without losing order, due dates, or assignees.",
  },
  {
    title: "Cards that stay current",
    description:
      "Due date, priority, status, comments, and members sit on the card. Open it for the thread, or scan the table for what is overdue.",
  },
  {
    title: "Workspaces and invites",
    description:
      "Group projects in a workspace and send a signed invite. People join the right board instead of following a shared link.",
  },
  {
    title: "Archive, then restore",
    description:
      "Lists, cards, and projects are archived, not deleted. Restore them later, or remove them only after they are already archived.",
  },
  {
    title: "Activity you can filter",
    description:
      "Moves, comments, archives, and emails are logged. Filter by project or task, then open a row for the full record.",
  },
  {
    title: "Email you can check",
    description:
      "Invites and custom templates go out through Resend. See what was sent, preview the HTML, and retry from the same page.",
  },
];
</script>

<template>
  <section id="features" class="scroll-mt-24 py-20 sm:py-24">
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div class="max-w-xl">
        <h2 class="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          What you use after you sign in
        </h2>
        <p class="mt-3 text-base leading-7 text-muted-foreground">
          These are the screens in the app, not a list of things we plan to add.
        </p>
      </div>

      <div class="mt-12 grid border-t border-border sm:grid-cols-2">
        <article
          v-for="feature in features"
          :key="feature.title"
          class="border-b border-border py-7 sm:px-8 sm:odd:pl-0 sm:even:pr-0"
        >
          <h3 class="text-[15px] font-semibold text-foreground">
            {{ feature.title }}
          </h3>
          <p class="mt-2 text-sm leading-6 text-muted-foreground">
            {{ feature.description }}
          </p>
        </article>
      </div>
    </div>
  </section>
</template>
