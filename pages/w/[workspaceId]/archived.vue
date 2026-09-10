<script setup lang="ts">
import { ArchiveRestoreIcon, Columns3Icon, FolderIcon, SquareIcon, Trash2Icon } from "lucide-vue-next";
import { relativeDate } from "@/utils/date";
import { toast } from "vue-sonner";
import type { ArchivedList, Project, Task } from "@/types";
import { archiveKindChip, whenChip } from "@/utils/table-chips";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

const when = (value: Date | string | null | undefined) =>
  value ? relativeDate(value) : "—";

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
      await workspaceStore.fetchArchive({ silent: true, force: true });
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
  <div class="h-full min-w-0">
    <div class="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 class="text-lg font-semibold tracking-tight text-foreground">Archive</h1>
        <p class="mt-1 text-sm text-muted-foreground">
          Restore items to the board, or delete them for good.
        </p>
      </div>
      <Tabs :model-value="filter" @update:model-value="filter = $event">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="list">Lists</TabsTrigger>
          <TabsTrigger value="card">Cards</TabsTrigger>
          <TabsTrigger value="project">Projects</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>

    <div class="overflow-hidden rounded-xl border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow class="hover:bg-transparent border-border">
            <TableHead class="h-10">Item</TableHead>
            <TableHead class="h-10 w-[100px]">Type</TableHead>
            <TableHead class="h-10">Location</TableHead>
            <TableHead class="h-10 w-[140px]">Archived</TableHead>
            <TableHead class="h-10 w-[96px] text-right">
              <span class="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableEmpty v-if="workspaceStore.archiveLoading" :colspan="5">
            <span class="text-muted-foreground">Loading archive…</span>
          </TableEmpty>
          <TableEmpty v-else-if="!rows.length" :colspan="5">
            <span class="text-muted-foreground">Nothing in the archive.</span>
          </TableEmpty>
          <TableRow v-for="row in rows" :key="row.id" class="group">
            <TableCell class="py-3">
              <p class="font-medium text-foreground leading-snug">{{ row.name }}</p>
              <p v-if="row.detail" class="mt-0.5 text-xs text-muted-foreground">
                {{ row.detail }}
              </p>
            </TableCell>
            <TableCell>
              <span :class="archiveKindChip(row.kind)">
                <Columns3Icon v-if="row.kind === 'list'" class="h-3 w-3" />
                <SquareIcon v-else-if="row.kind === 'card'" class="h-3 w-3" />
                <FolderIcon v-else class="h-3 w-3" />
                {{ kindLabel[row.kind] }}
              </span>
            </TableCell>
            <TableCell class="text-sm text-muted-foreground">
              {{ row.location || "—" }}
            </TableCell>
            <TableCell class="whitespace-nowrap">
              <span :class="whenChip(row.archivedAt)">
                {{ when(row.archivedAt) }}
              </span>
            </TableCell>
            <TableCell class="text-right">
              <div class="inline-flex items-center justify-end gap-0.5">
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
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <Dialog
      :open="!!pendingDelete"
      @update:open="(value) => { if (!value) pendingDelete = null }"
    >
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>Delete {{ pendingDelete ? kindLabel[pendingDelete.kind].toLowerCase() : "" }}</DialogTitle>
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
