<script setup lang="ts">
const columns = [
  {
    name: "To do",
    count: 2,
    cards: [
      {
        title: "Rewrite onboarding copy",
        priority: "HIGH",
        due: "Sep 4",
        dueTone: "amber",
        comments: 3,
      },
      {
        title: "Invite design to Website launch",
        priority: "MEDIUM",
        due: "Sep 8",
        dueTone: "slate",
        comments: 1,
      },
    ],
  },
  {
    name: "In progress",
    count: 1,
    cards: [
      {
        title: "Auth session on SSR",
        priority: "URGENT",
        due: "Today",
        dueTone: "rose",
        comments: 5,
      },
    ],
  },
  {
    name: "Done",
    count: 1,
    cards: [
      {
        title: "Prisma schema & seed",
        priority: "LOW",
        due: "Aug 28",
        dueTone: "slate",
        comments: 0,
      },
    ],
  },
];

const priorityClass: Record<string, string> = {
  LOW: "bg-slate-300 dark:bg-slate-500",
  MEDIUM: "bg-sky-400",
  HIGH: "bg-amber-400",
  URGENT: "bg-rose-500",
};

const dueClass: Record<string, string> = {
  amber:
    "bg-amber-50 text-amber-800 ring-amber-100 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-800",
  rose: "bg-rose-50 text-rose-700 ring-rose-100 dark:bg-rose-950/50 dark:text-rose-300 dark:ring-rose-800",
  slate:
    "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700",
};
</script>

<template>
  <div
    class="overflow-hidden rounded-xl border border-border bg-card shadow-2xl shadow-violet-950/10 ring-1 ring-black/5 dark:shadow-black/40"
  >
    <div
      class="flex items-center gap-2 border-b border-border bg-muted/60 px-3 py-2"
    >
      <span class="h-2.5 w-2.5 rounded-full bg-rose-400" />
      <span class="h-2.5 w-2.5 rounded-full bg-amber-400" />
      <span class="h-2.5 w-2.5 rounded-full bg-emerald-400" />
      <div
        class="ml-2 flex-1 truncate rounded-md bg-background px-3 py-1 text-center text-[11px] text-muted-foreground ring-1 ring-border"
      >
        app.northstar.dev / dashboard
      </div>
    </div>

    <div class="flex min-h-[340px] bg-background">
      <aside
        class="hidden w-[168px] shrink-0 border-r border-border bg-sidebar p-3 sm:block"
      >
        <p class="px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Projects
        </p>
        <div
          class="mt-1.5 rounded-md bg-violet-100 px-2 py-1.5 text-[12px] font-medium text-violet-900 dark:bg-violet-500/20 dark:text-violet-100"
        >
          Website launch
        </div>
        <div
          class="mt-0.5 rounded-md px-2 py-1.5 text-[12px] text-muted-foreground"
        >
          Mobile app
        </div>
        <p
          class="mt-4 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
        >
          Workspace
        </p>
        <div class="mt-1 space-y-0.5 text-[12px] text-muted-foreground">
          <div class="rounded-md px-2 py-1.5">Activities</div>
          <div class="rounded-md px-2 py-1.5">Emails</div>
          <div class="rounded-md px-2 py-1.5">Archive</div>
          <div class="rounded-md px-2 py-1.5">Settings</div>
        </div>
      </aside>

      <div class="min-w-0 flex-1 p-3 sm:p-4">
        <div class="mb-3 flex items-center justify-between gap-2">
          <div>
            <p class="text-[11px] text-muted-foreground">Northstar</p>
            <h3 class="text-sm font-semibold text-foreground">Website launch</h3>
          </div>
          <div class="flex rounded-md border border-border bg-muted/50 p-0.5 text-[11px] font-medium">
            <span
              class="rounded-[5px] bg-background px-2.5 py-1 text-foreground shadow-sm"
            >
              Board
            </span>
            <span class="px-2.5 py-1 text-muted-foreground">Table</span>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-2.5">
          <div
            v-for="column in columns"
            :key="column.name"
            class="rounded-lg bg-muted/70 p-2"
          >
            <div class="mb-2 flex items-center justify-between px-0.5">
              <span class="text-[11px] font-semibold text-foreground">
                {{ column.name }}
              </span>
              <span class="text-[10px] text-muted-foreground">{{ column.count }}</span>
            </div>
            <div class="space-y-2">
              <article
                v-for="card in column.cards"
                :key="card.title"
                class="rounded-md border border-border bg-card p-2 shadow-sm"
              >
                <div
                  class="mb-1.5 h-0.5 w-8 rounded-full"
                  :class="priorityClass[card.priority]"
                />
                <p class="text-[12px] font-medium leading-snug text-foreground">
                  {{ card.title }}
                </p>
                <div class="mt-2 flex items-center gap-1.5">
                  <span
                    class="inline-flex rounded px-1.5 py-0.5 text-[9px] font-medium ring-1 ring-inset"
                    :class="dueClass[card.dueTone]"
                  >
                    {{ card.due }}
                  </span>
                  <span
                    v-if="card.comments"
                    class="text-[10px] text-muted-foreground"
                  >
                    {{ card.comments }} comments
                  </span>
                </div>
              </article>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
