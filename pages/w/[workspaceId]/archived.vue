<script setup lang="ts">
import { ArchiveRestoreIcon, ArchiveIcon, Columns3Icon, FolderIcon, SquareIcon, Trash2Icon } from "lucide-vue-next";
import { groupActivitiesByDate } from "@/utils/activity";
import { relativeDate, whenDate } from "@/utils/date";
import { toast } from "vue-sonner";
import type { ArchivedList, Project, Task } from "@/types";
import { archiveKindChip } from "@/utils/table-chips";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

definePageMeta({
  layout: "dashboard",
  name: "workspace-archived",
  middleware: "workspace",
});

type ArchiveKind = "list" | "card" | "project";
type ArchiveFilter = "all" | ArchiveKind;

type ArchiveRow = {
  id: string
  kind: ArchiveKind
  name: string
  location: string
  detail: string
  archivedAt: Date | string | null
  list?: ArchivedList
  card?: Task
  project?: Project
};

const workspaceStore = useWorkspaceStore();
const boardStore = useBoardStore();
const filter = ref<ArchiveFilter>("all");
const busyId = ref<string | null>(null);
const pendingDelete = ref<ArchiveRow | null>(null);

await workspaceStore.fetchArchive();

watch(
  () => workspaceStore.activeWorkspaceId,
  () => {
    workspaceStore.fetchArchive();
  },
);

const onFilter = (value: unknown) => {
  if (value === "all" || value === "list" || value === "card" || value === "project") {
    filter.value = value;
  }
};

const rows = computed<ArchiveRow[]>(() => {
  const lists: ArchiveRow[] = workspaceStore.archivedLists.map((list) => ({
    id: `list-${list.id}`,
    kind: "list",
    name: list.name,
    location: list.projectName,
    detail: list.taskCount === 1 ? "1 card" : `${list.taskCount} cards`,
    archivedAt: list.archivedAt,
    list,
  }));
  const cards: ArchiveRow[] = workspaceStore.archivedCards.map((card) => ({
    id: `card-${card.id}`,
    kind: "card",
    name: card.title,
    location: [card.columnName, card.projectName].filter(Boolean).join(" · "),
    detail: "",
    archivedAt: card.archivedAt ?? null,
    card,
  }));
  const projects: ArchiveRow[] = workspaceStore.archivedProjects.map((project) => ({
    id: `project-${project.id}`,
    kind: "project",
    name: project.name,
    location: "Workspace",
    detail: "",
    archivedAt: project.archivedAt ?? null,
    project,
  }));
  const all = [...lists, ...cards, ...projects].sort((a, b) => {
    const aTime = a.archivedAt ? new Date(a.archivedAt).getTime() : 0;
    const bTime = b.archivedAt ? new Date(b.archivedAt).getTime() : 0;
    return bTime - aTime;
  });
  if (filter.value === "all") return all;
  return all.filter((row) => row.kind === filter.value);
});

const groups = computed(() =>
  groupActivitiesByDate(
    rows.value.map((row) => ({
      ...row,
      createdAt: row.archivedAt || new Date(0),
    })),
  ),
);

const counts = computed(() => ({
  total:
    workspaceStore.archivedLists.length +
    workspaceStore.archivedCards.length +
    workspaceStore.archivedProjects.length,
  lists: workspaceStore.archivedLists.length,
  cards: workspaceStore.archivedCards.length,
  projects: workspaceStore.archivedProjects.length,
}));

const statItems = computed(() => [
  { label: "Items", value: counts.value.total, icon: ArchiveIcon },
  { label: "Lists", value: counts.value.lists, icon: Columns3Icon },
  { label: "Cards", value: counts.value.cards, icon: SquareIcon },
  { label: "Projects", value: counts.value.projects, icon: FolderIcon },
]);

const kindLabel: Record<ArchiveKind, string> = {
  list: "List",
  card: "Card",
  project: "Project",
};

const restore = async (row: ArchiveRow) => {
  busyId.value = row.id;
  try {
    if (row.kind === "list" && row.list) {
      await workspaceStore.restoreList(row.list.id);
      toast.success("List restored");
    } else if (row.kind === "card" && row.card) {
      await boardStore.restoreTask(row.card.id);
      await workspaceStore.fetchArchive({ silent: true });
      toast.success("Card restored");
    } else if (row.kind === "project" && row.project) {
      await workspaceStore.updateProject(row.project.id, { archived: false });
      toast.success("Project restored");
    }
  } catch (error: any) {
    toast.error("Could not restore", {
      description: error?.data?.message || "Please try again.",
    });
  } finally {
    busyId.value = null;
  }
};

const confirmDelete = async () => {
  const row = pendingDelete.value;
  if (!row) return;
  busyId.value = row.id;
  try {
    if (row.kind === "list" && row.list) {
      await workspaceStore.deleteArchivedList(row.list.id);
    } else if (row.kind === "card" && row.card) {
      await workspaceStore.deleteArchivedCard(row.card.id);
    } else if (row.kind === "project" && row.project) {
      await workspaceStore.deleteArchivedProject(row.project.id);
    }
    pendingDelete.value = null;
    toast.success("Deleted permanently");
  } catch (error: any) {
    toast.error("Could not delete", {
      description: error?.data?.message || "Please try again.",
    });
  } finally {
    busyId.value = null;
  }
};

const deleteCopy = computed(() => {
  const row = pendingDelete.value;
  if (!row) return "";
  if (row.kind === "list") {
    return `This permanently removes “${row.name}” and ${row.detail || "its cards"}.`;
  }
  if (row.kind === "project") {
    return `This permanently removes the project “${row.name}” and everything in it.`;
  }
  return `This permanently removes the card “${row.name}”.`;
});
</script>

<template>
  <div class="h-full min-w-0 overflow-y-auto">
    <div class="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 class="text-xl font-semibold tracking-tight text-foreground">
          Archive
        </h1>
        <p class="mt-1 text-sm text-muted-foreground">
          Restore lists, cards, and projects to the board, or delete them for
          good.
        </p>
      </div>
      <Tabs :model-value="filter" @update:model-value="onFilter">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="list">Lists</TabsTrigger>
          <TabsTrigger value="card">Cards</TabsTrigger>
          <TabsTrigger value="project">Projects</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>

    <PageStats :items="statItems" :loading="workspaceStore.archiveLoading" />

    <div class="mt-5 overflow-hidden rounded-xl border border-border bg-card">
      <div
        v-if="workspaceStore.archiveLoading"
        class="divide-y divide-border"
      >
        <div
          v-for="index in 5"
          :key="index"
          class="flex items-start gap-3 px-4 py-3.5"
        >
          <Skeleton class="h-9 w-9 shrink-0 rounded-lg" />
          <div class="min-w-0 flex-1 space-y-2">
            <Skeleton class="h-4 w-2/3" />
            <Skeleton class="h-3 w-1/3" />
          </div>
        </div>
      </div>

      <div
        v-else-if="!rows.length"
        class="flex flex-col items-center px-4 py-16 text-center"
      >
        <div
          class="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground"
        >
          <ArchiveIcon class="h-5 w-5" />
        </div>
        <p class="mt-3 text-sm font-medium text-foreground">Archive is empty</p>
        <p class="mt-1 max-w-sm text-sm text-muted-foreground">
          Archived lists, cards, and projects will show up here so you can
          restore or permanently delete them.
        </p>
      </div>

      <div v-else>
        <section
          v-for="group in groups"
          :key="group.key"
          class="border-b border-border last:border-b-0"
        >
          <p
            class="sticky top-0 z-10 border-b border-border bg-muted/50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
            {{ group.label }}
          </p>
          <div class="divide-y divide-border">
            <div
              v-for="row in group.items"
              :key="row.id"
              class="flex items-start gap-3 px-4 py-3.5"
            >
              <div
                class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"
              >
                <Columns3Icon v-if="row.kind === 'list'" class="h-4 w-4" />
                <SquareIcon v-else-if="row.kind === 'card'" class="h-4 w-4" />
                <FolderIcon v-else class="h-4 w-4" />
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <p class="font-medium leading-5 text-foreground">
                      {{ row.name }}
                    </p>
                    <div class="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span :class="archiveKindChip(row.kind)">
                        {{ kindLabel[row.kind] }}
                      </span>
                      <span class="text-xs text-muted-foreground">
                        {{ row.location || "Workspace" }}
                      </span>
                      <span
                        v-if="row.detail"
                        class="text-xs text-muted-foreground"
                      >
                        · {{ row.detail }}
                      </span>
                    </div>
                  </div>
                  <span
                    class="shrink-0 pt-0.5 text-xs tabular-nums text-muted-foreground"
                    :title="whenDate(row.createdAt).title"
                  >
                    {{ relativeDate(row.createdAt) }}
                  </span>
                </div>
              </div>
              <div class="flex shrink-0 items-center gap-0.5">
                <Tooltip>
                  <TooltipTrigger as-child>
                    <Button
                      variant="ghost"
                      size="icon"
                      class="h-8 w-8 text-muted-foreground hover:text-foreground"
                      :disabled="busyId === row.id"
                      @click="restore(row)"
                    >
                      <ArchiveRestoreIcon class="h-4 w-4" />
                      <span class="sr-only">Restore</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Restore</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger as-child>
                    <Button
                      variant="ghost"
                      size="icon"
                      class="h-8 w-8 text-muted-foreground hover:text-destructive"
                      :disabled="busyId === row.id"
                      @click="pendingDelete = row"
                    >
                      <Trash2Icon class="h-4 w-4" />
                      <span class="sr-only">Delete</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Delete</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>

    <Dialog
      :open="!!pendingDelete"
      @update:open="
        (value) => {
          if (!value) pendingDelete = null;
        }
      "
    >
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>
            Delete
            {{ pendingDelete ? kindLabel[pendingDelete.kind].toLowerCase() : "" }}
          </DialogTitle>
          <DialogDescription>{{ deleteCopy }}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" @click="pendingDelete = null">Cancel</Button>
          <Button
            variant="destructive"
            :disabled="busyId === pendingDelete?.id"
            @click="confirmDelete"
          >
            <Trash2Icon class="h-4 w-4" />
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
