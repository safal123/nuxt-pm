<script setup lang="ts">
import { Columns3Icon, Table2Icon } from "lucide-vue-next";
import type { Project } from "@/types";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

definePageMeta({
  layout: "dashboard",
});

const userStore = useUserStore();
const workspaceStore = useWorkspaceStore();
const { view, setView } = useProjectView();

const activeProject = computed(() =>
  workspaceStore.getActiveWorkspace?.projects?.find(
    (project: Project) => project.id === userStore.user?.activeProjectId,
  ),
);
</script>

<template>
  <div class="h-full min-w-0">
    <template v-if="activeProject">
      <div class="flex items-center justify-between gap-4 mb-4">
        <h1 class="text-lg font-semibold text-foreground truncate">
          {{ activeProject.name }}
        </h1>
        <Tabs :model-value="view" @update:model-value="setView">
          <TabsList>
            <TabsTrigger value="board">
              <span class="inline-flex items-center gap-1.5">
                <Columns3Icon class="h-3.5 w-3.5" />
                Board
              </span>
            </TabsTrigger>
            <TabsTrigger value="table">
              <span class="inline-flex items-center gap-1.5">
                <Table2Icon class="h-3.5 w-3.5" />
                Table
              </span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <KanbanBoard :project-id="activeProject.id" />
    </template>
    <div
      v-else
      class="flex flex-col items-center justify-center text-center py-24 text-muted-foreground"
    >
      <p class="text-sm">Select or create a project to see its tasks.</p>
    </div>
  </div>
</template>
