<script setup lang="ts">
import { Columns3Icon, PencilIcon, Table2Icon } from "lucide-vue-next";
import type { Project } from "@/types";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "vue-sonner";

definePageMeta({
  layout: "dashboard",
  name: "workspace-project",
  middleware: "workspace",
});

const route = useRoute();
const userStore = useUserStore();
const workspaceStore = useWorkspaceStore();
const { view, setView } = useProjectView();
const { requestedProjectId, consumeRename } = useProjectRename();
const workspaceId = computed(() => String(route.params.workspaceId || ""));

const projectId = computed(() => String(route.params.projectId || ""));

const activeProject = computed(() =>
  workspaceStore.getActiveWorkspace?.projects?.find(
    (project: Project) =>
      project.id === projectId.value && !project.archivedAt,
  ),
);

watch(
  [projectId, () => workspaceStore.getActiveWorkspace?.projects],
  async () => {
    if (!projectId.value || !workspaceStore.getActiveWorkspace) return;
    if (!activeProject.value) {
      const ws = workspaceId.value;
      if (ws) {
        await navigateTo(
          { name: "workspace-projects", params: { workspaceId: ws } },
          { replace: true },
        );
      }
      return;
    }
    if (userStore.user?.activeProjectId !== projectId.value) {
      await userStore.updateUser({ activeProjectId: projectId.value });
    }
  },
  { immediate: true },
);

const isEditing = ref(false);
const saving = ref(false);
const nameDraft = ref("");
const titleInput = ref<HTMLInputElement | null>(null);

watch(
  () => activeProject.value?.name,
  (name: any) => {
    if (!isEditing.value && name) nameDraft.value = name;
  },
  { immediate: true },
);

const startEditing = async () => {
  if (!activeProject.value || saving.value) return;
  nameDraft.value = activeProject.value.name;
  isEditing.value = true;
  await nextTick();
  titleInput.value?.focus();
  titleInput.value?.select();
};

watch(requestedProjectId, async (id) => {
  if (!id || id !== activeProject.value?.id) return;
  consumeRename(id);
  await startEditing();
});

watch(
  () => activeProject.value?.id,
  async (id, previousId) => {
    if (id && requestedProjectId.value === id) {
      consumeRename(id);
      await startEditing();
      return;
    }
    if (id !== previousId) {
      isEditing.value = false;
      nameDraft.value = activeProject.value?.name ?? "";
    }
  },
);

const cancelEditing = () => {
  isEditing.value = false;
  nameDraft.value = activeProject.value?.name ?? "";
};

const saveTitle = async () => {
  if (!isEditing.value || saving.value || !activeProject.value) return;
  const next = nameDraft.value.trim();
  isEditing.value = false;

  if (!next) {
    nameDraft.value = activeProject.value.name;
    return;
  }
  if (next === activeProject.value.name) return;

  saving.value = true;
  try {
    await workspaceStore.updateProject(activeProject.value.id, { name: next });
  } catch (error: any) {
    nameDraft.value = activeProject.value.name;
    toast.error("Could not rename project", {
      description: error?.data?.message || "Please try again.",
    });
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <div class="h-full min-w-0">
    <template v-if="activeProject">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div class="min-w-0 flex-1">
          <input
            v-if="isEditing"
            ref="titleInput"
            v-model="nameDraft"
            aria-label="Project name"
            class="h-8 w-full max-w-md rounded-md border border-input bg-background px-2 text-lg font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-violet-400"
            :disabled="saving"
            @blur="saveTitle"
            @keyup.enter="saveTitle"
            @keyup.esc="cancelEditing"
          />
          <button
            v-else
            type="button"
            class="group flex min-w-0 max-w-full items-center gap-2 rounded-md px-1 py-0.5 -ml-1 text-left hover:bg-accent"
            title="Rename project"
            @click="startEditing"
          >
            <h1 class="min-w-0 truncate text-lg font-semibold text-foreground">
              {{ activeProject.name }}
            </h1>
            <PencilIcon
              class="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
            />
          </button>
        </div>
        <Tabs :model-value="view" @update:model-value="setView">
          <TabsList>
            <TabsTrigger value="board">
              <span class="inline-flex items-center gap-1.5">
                <Columns3Icon class="h-3.5 w-3.5" />
                <span class="hidden sm:inline">Board</span>
              </span>
            </TabsTrigger>
            <TabsTrigger value="table">
              <span class="inline-flex items-center gap-1.5">
                <Table2Icon class="h-3.5 w-3.5" />
                <span class="hidden sm:inline">Table</span>
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
      <p class="text-sm">This project is not in this workspace.</p>
    </div>
  </div>
</template>
