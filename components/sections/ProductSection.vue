<script setup lang="ts">
import {
  ArchiveIcon,
  LayoutGridIcon,
  MailIcon,
  ScrollTextIcon,
} from "lucide-vue-next";

const products = [
  {
    id: "boards",
    eyebrow: "Projects",
    title: "Board when you plan. Table when you scan.",
    body: "Each project has a board with lists and cards, plus a table of the same work. Switch the default in Settings. Due dates, priority, and members stay in sync either way.",
    icon: LayoutGridIcon,
    visual: "board",
  },
  {
    id: "archive",
    eyebrow: "Archive",
    title: "Nothing important disappears.",
    body: "Archive a card, a list, or a whole project. Lists take their cards with them. Restore from the archive table, or delete permanently only after something is already archived.",
    icon: ArchiveIcon,
    visual: "archive",
  },
  {
    id: "activity",
    eyebrow: "Activities",
    title: "A single feed for the workspace.",
    body: "Moves, comments, members, archives, and emails land in one table. Filter by project or task. Click a row to open the full record — including the email template when one was sent.",
    icon: ScrollTextIcon,
    visual: "activity",
  },
  {
    id: "email",
    eyebrow: "Emails",
    title: "Invites and custom mail, with a paper trail.",
    body: "Workspace invites, member notices, and your own templates are logged per sender. Preview the HTML that went out, and send a branded card without leaving Northstar.",
    icon: MailIcon,
    visual: "email",
  },
];
</script>

<template>
  <section id="product" class="scroll-mt-24 border-y border-border bg-muted/30 py-20 sm:py-28">
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div class="mx-auto max-w-2xl text-center">
        <p class="text-sm font-medium text-primary">Product</p>
        <h2 class="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          One sidebar. The whole workspace.
        </h2>
        <p class="mt-4 text-base leading-7 text-muted-foreground">
          Projects sit at the top. Activities, Emails, Archive, and Settings sit
          underneath — the same layout you use after you sign in.
        </p>
      </div>

      <div class="mx-auto mt-16 max-w-5xl space-y-16">
        <article
          v-for="(item, index) in products"
          :key="item.id"
          class="grid items-center gap-10 lg:grid-cols-2"
        >
          <div :class="index % 2 === 1 ? 'lg:order-2' : ''">
            <div
              class="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground"
            >
              <component :is="item.icon" class="h-3.5 w-3.5 text-primary" />
              {{ item.eyebrow }}
            </div>
            <h3 class="mt-4 text-2xl font-semibold tracking-tight text-foreground">
              {{ item.title }}
            </h3>
            <p class="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">
              {{ item.body }}
            </p>
          </div>

          <div
            class="rounded-xl border border-border bg-card p-4 shadow-sm"
            :class="index % 2 === 1 ? 'lg:order-1' : ''"
          >
            <div v-if="item.visual === 'board'" class="space-y-2">
              <div class="flex gap-1 rounded-md bg-muted p-1 text-[11px] font-medium">
                <span class="rounded bg-background px-2 py-1 shadow-sm">Board</span>
                <span class="px-2 py-1 text-muted-foreground">Table</span>
              </div>
              <div class="grid grid-cols-3 gap-2">
                <div
                  v-for="col in ['To do', 'In progress', 'Done']"
                  :key="col"
                  class="rounded-md bg-muted/80 p-2"
                >
                  <p class="mb-2 text-[10px] font-semibold">{{ col }}</p>
                  <div class="h-14 rounded border border-border bg-card" />
                  <div
                    v-if="col !== 'Done'"
                    class="mt-1.5 h-10 rounded border border-dashed border-border/80"
                  />
                </div>
              </div>
            </div>

            <div v-else-if="item.visual === 'archive'" class="space-y-2 text-[12px]">
              <div
                class="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-md border border-border px-3 py-2"
              >
                <span
                  class="rounded-md bg-sky-50 px-1.5 py-0.5 text-[11px] font-medium text-sky-700 ring-1 ring-inset ring-sky-100 dark:bg-sky-950/50 dark:text-sky-300 dark:ring-sky-800"
                >
                  List
                </span>
                <span class="truncate font-medium">Sprint backlog</span>
                <span class="text-muted-foreground">Restore</span>
              </div>
              <div
                class="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-md border border-border px-3 py-2"
              >
                <span
                  class="rounded-md bg-violet-50 px-1.5 py-0.5 text-[11px] font-medium text-violet-700 ring-1 ring-inset ring-violet-100 dark:bg-violet-950/50 dark:text-violet-300 dark:ring-violet-800"
                >
                  Card
                </span>
                <span class="truncate font-medium">Auth cookies on SSR</span>
                <span class="text-muted-foreground">Restore</span>
              </div>
              <div
                class="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-md border border-border px-3 py-2"
              >
                <span
                  class="rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-800 ring-1 ring-inset ring-amber-100 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-800"
                >
                  Project
                </span>
                <span class="truncate font-medium">Website launch</span>
                <span class="text-muted-foreground">Restore</span>
              </div>
            </div>

            <div v-else-if="item.visual === 'activity'" class="space-y-2 text-[12px]">
              <div class="flex items-center justify-between rounded-md border border-border px-3 py-2">
                <div class="min-w-0">
                  <p class="truncate font-medium">Moved Auth cookies to In progress</p>
                  <p class="text-[11px] text-muted-foreground">Website launch · 2h ago</p>
                </div>
                <span
                  class="shrink-0 rounded-md bg-indigo-50 px-1.5 py-0.5 text-[11px] font-medium text-indigo-700 ring-1 ring-inset ring-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-300 dark:ring-indigo-800"
                >
                  Moved
                </span>
              </div>
              <div class="flex items-center justify-between rounded-md border border-border px-3 py-2">
                <div class="min-w-0">
                  <p class="truncate font-medium">Sent workspace invite to Prejita</p>
                  <p class="text-[11px] text-muted-foreground">Northstar · 5h ago</p>
                </div>
                <span
                  class="shrink-0 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-800"
                >
                  Email sent
                </span>
              </div>
              <div class="flex items-center justify-between rounded-md border border-border px-3 py-2">
                <div class="min-w-0">
                  <p class="truncate font-medium">Archived Sprint backlog</p>
                  <p class="text-[11px] text-muted-foreground">Website launch · Yesterday</p>
                </div>
                <span
                  class="shrink-0 rounded-md bg-orange-50 px-1.5 py-0.5 text-[11px] font-medium text-orange-700 ring-1 ring-inset ring-orange-100 dark:bg-orange-950/50 dark:text-orange-300 dark:ring-orange-800"
                >
                  Archived
                </span>
              </div>
            </div>

            <div v-else class="space-y-3 text-[12px]">
              <div class="rounded-lg border border-border bg-muted/40 p-4">
                <p class="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Template
                </p>
                <p class="mt-1 font-semibold text-foreground">You’re invited to Northstar</p>
                <p class="mt-2 text-muted-foreground">
                  Join the workspace to open boards, comment on cards, and pick
                  up what’s due.
                </p>
                <div class="mt-3 flex gap-2">
                  <span
                    class="rounded-md bg-violet-50 px-1.5 py-0.5 text-[11px] font-medium text-violet-700 ring-1 ring-inset ring-violet-100 dark:bg-violet-950/50 dark:text-violet-300 dark:ring-violet-800"
                  >
                    workspace-invite
                  </span>
                  <span
                    class="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-800"
                  >
                    Sent
                  </span>
                </div>
              </div>
            </div>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>
