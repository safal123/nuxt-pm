<script setup lang="ts">
import { toast } from "vue-sonner";
import { toTypedSchema } from "@vee-validate/zod";
import {
  ArchiveIcon,
  CalendarDaysIcon,
  Columns3Icon,
  FolderIcon,
  Settings2Icon,
  Table2Icon,
  UsersIcon,
} from "lucide-vue-next";
import { projectCreateSchema } from "~/server/utils/schemas";
import { formatDate } from "@/utils/date";
import type { Project, ProjectView } from "@/types";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

definePageMeta({
  layout: "dashboard",
  name: "workspace-project-settings",
  middleware: "workspace",
});

const route = useRoute();
const userStore = useUserStore();
const workspaceStore = useWorkspaceStore();
const modalsStore = useModalsStore();
const { rememberView } = useProjectView();

const workspaceId = computed(() => String(route.params.workspaceId || ""));
const projectId = computed(() => String(route.params.projectId || ""));

const project = computed(() =>
  workspaceStore.getActiveWorkspace?.projects?.find(
    (item: Project) => item.id === projectId.value && !item.archivedAt,
  ),
);

const isCreator = computed(
  () => !!userStore.user && project.value?.createdBy === userStore.user.id,
);

const createdLabel = computed(() => {
  const value = project.value?.createdAt;
  return value ? formatDate(value) ?? "—" : "—";
});

const formSchema = toTypedSchema(
  projectCreateSchema.pick({ name: true, description: true }),
);
const formKey = ref(0);
const saving = ref(false);
const savingView = ref(false);
type SettingsTab = "general" | "defaults" | "people" | "calendar" | "archive";
const tab = ref<SettingsTab>("general");

watch(
  () => project.value?.id,
  (id) => {
    if (!id) return;
    formKey.value += 1;
    tab.value = "general";
  },
);

watch(isCreator, (value) => {
  if (!value && tab.value === "archive") tab.value = "general";
});

watch(
  [projectId, () => workspaceStore.getActiveWorkspace?.projects],
  async () => {
    if (!projectId.value || !workspaceStore.getActiveWorkspace) return;
    if (!project.value) {
      await navigateTo(
        { name: "workspace-projects", params: { workspaceId: workspaceId.value } },
        { replace: true },
      );
    }
  },
  { immediate: true },
);

async function onSubmit(values: { name: string; description?: string | null }) {
  if (saving.value || !project.value) return;
  if (
    values.name === project.value.name &&
    (values.description ?? null) === (project.value.description ?? null)
  ) {
    return;
  }
  saving.value = true;
  try {
    await workspaceStore.updateProject(project.value.id, {
      name: values.name,
      description: values.description ?? null,
    });
    toast.success("Project updated");
  } catch (error: any) {
    toast.error(error?.data?.message || "Could not update the project.");
  } finally {
    saving.value = false;
  }
}

const sections = computed(() => {
  const items: { id: SettingsTab; label: string; icon: typeof FolderIcon }[] = [
    { id: "general", label: "General", icon: FolderIcon },
    { id: "defaults", label: "Defaults", icon: Settings2Icon },
    { id: "people", label: "People", icon: UsersIcon },
    { id: "calendar", label: "Calendar", icon: CalendarDaysIcon },
  ];
  if (isCreator.value) {
    items.push({ id: "archive", label: "Archive", icon: ArchiveIcon });
  }
  return items;
});

const setDefaultView = async (value: unknown) => {
  if (value !== "board" && value !== "table" && value !== "calendar") return;
  if (!project.value || project.value.settings?.defaultView === value) return;
  savingView.value = true;
  try {
    await workspaceStore.updateProjectSettings(project.value.id, {
      defaultView: value,
    });
    rememberView(project.value.id, value as ProjectView);
    toast.success("Default view saved");
  } catch (error: any) {
    toast.error(error?.data?.message || "Could not save the default view.");
  } finally {
    savingView.value = false;
  }
};
</script>

<template>
  <div class="flex h-full min-w-0 flex-col overflow-hidden">
    <div v-if="project" class="flex min-h-0 flex-1 flex-col">
      <PageHeader
        title="Project settings"
        :description="`Controls for ${project.name}.`"
      >
        <Button variant="outline" as-child>
          <NuxtLink
            :to="{
              name: 'workspace-project',
              params: { workspaceId, projectId },
            }"
          >
            Back to board
          </NuxtLink>
        </Button>
      </PageHeader>

      <div
        class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card sm:flex-row"
      >
        <nav
          class="flex shrink-0 gap-1 overflow-x-auto border-b border-border p-2.5 sm:w-44 sm:flex-col sm:border-b-0 sm:border-r"
        >
          <button
            v-for="section in sections"
            :key="section.id"
            type="button"
            class="inline-flex h-8 shrink-0 items-center gap-2 rounded-lg px-2.5 text-[12px] font-medium transition-colors"
            :class="
              tab === section.id
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
            "
            @click="tab = section.id"
          >
            <component :is="section.icon" class="size-3.5" />
            {{ section.label }}
          </button>
        </nav>

        <div class="min-h-0 min-w-0 flex-1 overflow-y-auto p-5">
          <div v-if="tab === 'general'" class="space-y-4">
            <PageSection
              title="General"
              description="Name and description shown in the sidebar and project list."
            >
              <Form
                :key="formKey"
                v-slot="{ handleSubmit }"
                as=""
                :validation-schema="formSchema"
                :initial-values="{
                  name: project.name,
                  description: project.description ?? '',
                }"
              >
                <form
                  class="space-y-3"
                  @submit="handleSubmit($event, onSubmit)"
                >
                  <FormField v-slot="{ componentField }" name="name">
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input v-bind="componentField" :disabled="saving" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  </FormField>
                  <FormField v-slot="{ componentField }" name="description">
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          v-bind="componentField"
                          rows="3"
                          placeholder="What this project is for"
                          :disabled="saving"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  </FormField>
                  <Button type="submit" :disabled="saving">
                    {{ saving ? "Saving…" : "Save" }}
                  </Button>
                </form>
              </Form>
              <div
                class="grid gap-1 border-t border-border pt-3 sm:grid-cols-[140px_1fr]"
              >
                <p class="text-[12px] text-muted-foreground">Created</p>
                <p class="text-[13px] text-foreground">{{ createdLabel }}</p>
              </div>
            </PageSection>
          </div>

          <div v-else-if="tab === 'defaults'" class="space-y-4">
            <PageSection
              title="Defaults"
              description="Board, table, or calendar when someone opens this project. Anyone can still switch in the toolbar."
            >
              <Tabs
                :model-value="project.settings?.defaultView ?? 'board'"
                @update:model-value="setDefaultView"
              >
                <TabsList>
                  <TabsTrigger value="board" :disabled="savingView">
                    <Columns3Icon />
                    Board
                  </TabsTrigger>
                  <TabsTrigger value="table" :disabled="savingView">
                    <Table2Icon />
                    Table
                  </TabsTrigger>
                  <TabsTrigger value="calendar" :disabled="savingView">
                    <CalendarDaysIcon />
                    Calendar
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </PageSection>
          </div>

          <div v-else-if="tab === 'people'" class="space-y-4">
            <PageSection
              title="People"
              description="People who can be assigned to cards on this board."
            >
              <div
                class="inline-flex h-8 items-center rounded-md border border-input bg-background px-3 text-[12px] font-medium shadow-sm hover:bg-accent"
              >
                <LazyProjectMembersModal
                  :project-id="project.id"
                  :workspace-id="workspaceId"
                />
              </div>
            </PageSection>
          </div>

          <div v-else-if="tab === 'calendar'" class="space-y-4">
            <PageSection
              title="Calendar"
              description="Google calendars are connected from the calendar view. More providers will be added here."
            >
              <Button
                variant="outline"
                as-child
                @click="rememberView(project.id, 'calendar')"
              >
                <NuxtLink
                  :to="{
                    name: 'workspace-project',
                    params: { workspaceId, projectId },
                  }"
                >
                  Open calendar
                </NuxtLink>
              </Button>
            </PageSection>
          </div>

          <div v-else-if="tab === 'archive' && isCreator" class="space-y-4">
            <PageSection
              title="Archive"
              description="Hide the board from the sidebar. You can restore it from Archive."
            >
              <Button
                variant="outline"
                @click="
                  modalsStore.openModal('archiveProject', {
                    projectId: project.id,
                    projectTitle: project.name,
                  })
                "
              >
                Archive
              </Button>
            </PageSection>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
