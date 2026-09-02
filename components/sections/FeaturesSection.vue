<script setup lang="ts">
import {
  ArchiveIcon,
  Columns3Icon,
  HistoryIcon,
  MailIcon,
  Table2Icon,
  UsersIcon,
} from "lucide-vue-next";

const features = [
  {
    title: "Board and table",
    description:
      "Run each project as a kanban board or a table. Drag cards between lists, then switch views without losing order, due dates, or assignees.",
    icon: Columns3Icon,
  },
  {
    title: "Tasks that stay current",
    description:
      "Due dates, priority, status, comments, and members live on every card. Open a task for the full thread — or scan the table for what’s overdue.",
    icon: Table2Icon,
  },
  {
    title: "Workspaces and invites",
    description:
      "Group projects in a workspace, add members, and send a secure invite. People join the right board instead of hunting for a shared link.",
    icon: UsersIcon,
  },
  {
    title: "Archive, then restore",
    description:
      "Lists, cards, and projects are archived — not deleted. Restore when you need them back, or permanently remove from the archive when you’re sure.",
    icon: ArchiveIcon,
  },
  {
    title: "Activity you can filter",
    description:
      "Every move, comment, archive, and email is logged. Filter by project or task, then open a row for the full detail.",
    icon: HistoryIcon,
  },
  {
    title: "Email you can track",
    description:
      "Invites, member notices, and custom templates go out through Resend. See what you sent, preview the HTML, and retry from the same sidebar.",
    icon: MailIcon,
  },
];
</script>

<template>
  <section id="features" class="scroll-mt-24 py-20 sm:py-28">
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div class="mx-auto max-w-2xl text-center">
        <p class="text-sm font-medium text-primary">Built for how you already work</p>
        <h2 class="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          The same tools as the dashboard — not a marketing wishlist.
        </h2>
        <p class="mt-4 text-base leading-7 text-muted-foreground">
          Northstar is a workspace: projects, boards, archive, activity, and
          email. What you see here is what you get after you sign in.
        </p>
      </div>

      <div class="mx-auto mt-14 grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <article
          v-for="feature in features"
          :key="feature.title"
          class="rounded-xl border border-border bg-card p-6 shadow-sm"
        >
          <div
            class="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300"
          >
            <component :is="feature.icon" class="h-5 w-5" />
          </div>
          <h3 class="mt-4 text-base font-semibold text-foreground">
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
