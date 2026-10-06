<script setup lang="ts">
const products = [
  {
    id: "boards",
    label: "Projects",
    title: "Board when you plan. Table when you scan.",
    body: "Each project has lists and cards, plus a table of the same work. Due dates, priority, and members stay in sync. Set the default view in Settings.",
    visual: "board",
  },
  {
    id: "archive",
    label: "Archive",
    title: "Finished work stays recoverable.",
    body: "Archive a card, a list, or a project. Lists take their cards with them. Restore from the archive table. Permanent delete is only available after something is archived.",
    visual: "archive",
  },
  {
    id: "activity",
    label: "Activities",
    title: "One feed for the workspace.",
    body: "Moves, comments, members, archives, and emails land in one table. Filter by project or task. Open a row for the full record, including the email that was sent.",
    visual: "activity",
  },
  {
    id: "email",
    label: "Emails",
    title: "Invites and templates, with a send log.",
    body: "Workspace invites, member notices, and your own templates are stored per sender. Preview the HTML that went out without leaving Northstar.",
    visual: "email",
  },
];
</script>

<template>
  <section id="product" class="scroll-mt-24 border-y border-border py-20 sm:py-24">
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div class="max-w-xl">
        <h2 class="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          The same layout as the signed-in app
        </h2>
        <p class="mt-3 text-base leading-7 text-muted-foreground">
          Projects at the top. Activities, Emails, Archive, and Settings
          underneath.
        </p>
      </div>

      <div class="mt-14 space-y-16">
        <article
          v-for="item in products"
          :key="item.id"
          class="grid items-start gap-8 lg:grid-cols-[minmax(0,22rem)_1fr] lg:gap-16"
        >
          <div>
            <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {{ item.label }}
            </p>
            <h3 class="mt-2 text-xl font-semibold tracking-tight text-foreground">
              {{ item.title }}
            </h3>
            <p class="mt-3 text-sm leading-7 text-muted-foreground">
              {{ item.body }}
            </p>
          </div>

          <div class="rounded-lg border border-border bg-card p-4">
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
                class="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-border px-1 py-2.5"
              >
                <span class="text-muted-foreground">List</span>
                <span class="truncate font-medium">Sprint backlog</span>
                <span class="text-muted-foreground">Restore</span>
              </div>
              <div
                class="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-border px-1 py-2.5"
              >
                <span class="text-muted-foreground">Card</span>
                <span class="truncate font-medium">Auth cookies on SSR</span>
                <span class="text-muted-foreground">Restore</span>
              </div>
              <div
                class="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-1 py-2.5"
              >
                <span class="text-muted-foreground">Project</span>
                <span class="truncate font-medium">Website launch</span>
                <span class="text-muted-foreground">Restore</span>
              </div>
            </div>

            <div v-else-if="item.visual === 'activity'" class="space-y-0 text-[12px]">
              <div class="flex items-center justify-between border-b border-border px-1 py-2.5">
                <div class="min-w-0 pr-4">
                  <p class="truncate font-medium">Moved Auth cookies to In progress</p>
                  <p class="text-[11px] text-muted-foreground">Website launch · 2h ago</p>
                </div>
                <span class="shrink-0 text-muted-foreground">Moved</span>
              </div>
              <div class="flex items-center justify-between border-b border-border px-1 py-2.5">
                <div class="min-w-0 pr-4">
                  <p class="truncate font-medium">Sent workspace invite to Prejita</p>
                  <p class="text-[11px] text-muted-foreground">Northstar · 5h ago</p>
                </div>
                <span class="shrink-0 text-muted-foreground">Email sent</span>
              </div>
              <div class="flex items-center justify-between px-1 py-2.5">
                <div class="min-w-0 pr-4">
                  <p class="truncate font-medium">Archived Sprint backlog</p>
                  <p class="text-[11px] text-muted-foreground">Website launch · Yesterday</p>
                </div>
                <span class="shrink-0 text-muted-foreground">Archived</span>
              </div>
            </div>

            <div v-else class="space-y-3 text-[12px]">
              <p class="text-[11px] text-muted-foreground">Template</p>
              <p class="font-semibold text-foreground">You are invited to Northstar</p>
              <p class="text-muted-foreground">
                Join the workspace to open boards, comment on cards, and pick
                up what is due.
              </p>
              <p class="text-muted-foreground">workspace-invite · Sent</p>
            </div>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>
