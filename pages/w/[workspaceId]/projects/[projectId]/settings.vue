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

watch(
  () => project.value?.id,
  (id) => {
    if (id) formKey.value += 1;
  },
);

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

const sections = computed(() => [
  { id: "general", label: "General", icon: FolderIcon },
  { id: "defaults", label: "Defaults", icon: Settings2Icon },
  { id: "people", label: "People", icon: UsersIcon },
  { id: "calendar", label: "Calendar", icon: CalendarDaysIcon },
  ...(isCreator.value
    ? [{ id: "archive", label: "Archive", icon: ArchiveIcon }]
    : []),
]);

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
      <div class="mb-6 flex shrink-0 items-start justify-between gap-3">
        <div class="min-w-0">
          <h1 class="text-lg font-semibold tracking-tight text-foreground">
            Project settings
          </h1>
          <p class="mt-1 text-sm text-muted-foreground">
            Controls for {{ project.name }}.
          </p>
        </div>
        <Button variant="outline" size="sm" as-child>
          <NuxtLink
            :to="{
              name: 'workspace-project',
              params: { workspaceId, projectId },
            }"
          >
            Back to board
          </NuxtLink>
        </Button>
      </div>

      <div class="grid min-h-0 flex-1 items-start gap-8 lg:grid-cols-[13rem_minmax(0,1fr)]">
        <nav class="flex shrink-0 gap-2 overflow-x-auto lg:sticky lg:top-0 lg:flex-col lg:overflow-visible">
          <a
            v-for="section in sections"
            :key="section.id"
            :href="`#${section.id}`"
            class="inline-flex shrink-0 items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <component :is="section.icon" class="h-3.5 w-3.5" />
            {{ section.label }}
          </a>
        </nav>

        <div class="min-h-0 min-w-0 space-y-8 overflow-y-auto pb-10">
          <section id="general" class="scroll-mt-20 space-y-3">
            <div class="flex items-center gap-2">
              <FolderIcon class="h-4 w-4 text-muted-foreground" />
              <h2 class="text-sm font-semibold text-foreground">General</h2>
            </div>
            <div class="overflow-hidden rounded-xl border border-border bg-card">
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
                <form class="space-y-5 p-4 sm:p-5" @submit="handleSubmit($event, onSubmit)">
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
                  <div class="flex justify-end">
                    <Button type="submit" :disabled="saving">
                      {{ saving ? "Saving…" : "Save" }}
                    </Button>
                  </div>
                </form>
              </Form>
              <div class="grid gap-1 border-t border-border px-4 py-4 sm:grid-cols-[140px_1fr] sm:px-5">
                <p class="text-sm text-muted-foreground">Created</p>
                <p class="text-sm text-foreground">{{ createdLabel }}</p>
              </div>
            </div>
          </section>

          <section id="defaults" class="scroll-mt-20 space-y-3">
            <div class="flex items-center gap-2">
              <Settings2Icon class="h-4 w-4 text-muted-foreground" />
              <h2 class="text-sm font-semibold text-foreground">Defaults</h2>
            </div>
            <div class="overflow-hidden rounded-xl border border-border bg-card">
              <div
                class="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
              >
                <div class="min-w-0">
                  <p class="text-sm font-medium text-foreground">Default view</p>
                  <p class="mt-0.5 text-sm text-muted-foreground">
                    Board, table, or calendar when someone opens this project.
                    Anyone can still switch in the toolbar.
                  </p>
                </div>
                <Tabs
                  :model-value="project.settings?.defaultView ?? 'board'"
                  @update:model-value="setDefaultView"
                >
                  <TabsList>
                    <TabsTrigger value="board" :disabled="savingView">
                      <span class="inline-flex items-center gap-1.5">
                        <Columns3Icon class="h-3.5 w-3.5" />
                        Board
                      </span>
                    </TabsTrigger>
                    <TabsTrigger value="table" :disabled="savingView">
                      <span class="inline-flex items-center gap-1.5">
                        <Table2Icon class="h-3.5 w-3.5" />
                        Table
                      </span>
                    </TabsTrigger>
                    <TabsTrigger value="calendar" :disabled="savingView">
                      <span class="inline-flex items-center gap-1.5">
                        <CalendarDaysIcon class="h-3.5 w-3.5" />
                        Calendar
                      </span>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>
          </section>

          <section id="people" class="scroll-mt-20 space-y-3">
            <div class="flex items-center gap-2">
              <UsersIcon class="h-4 w-4 text-muted-foreground" />
              <h2 class="text-sm font-semibold text-foreground">People</h2>
            </div>
            <div
              class="flex flex-col gap-3 rounded-xl border border-border bg-card px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
            >
              <div class="min-w-0">
                <p class="text-sm font-medium text-foreground">Project members</p>
                <p class="mt-0.5 text-sm text-muted-foreground">
                  People who can be assigned to cards on this board.
                </p>
              </div>
              <div
                class="inline-flex h-8 items-center rounded-md border border-input bg-background px-3 text-xs font-medium shadow-sm hover:bg-accent"
              >
                <LazyProjectMembersModal :project-id="project.id" :workspace-id="workspaceId" />
              </div>
            </div>
          </section>

          <section id="calendar" class="scroll-mt-20 space-y-3">
            <div class="flex items-center gap-2">
              <CalendarDaysIcon class="h-4 w-4 text-muted-foreground" />
              <h2 class="text-sm font-semibold text-foreground">Calendar</h2>
            </div>
            <div
              class="flex flex-col gap-3 rounded-xl border border-border bg-card px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
            >
              <div class="min-w-0">
                <p class="text-sm font-medium text-foreground">Connected calendars</p>
                <p class="mt-0.5 text-sm text-muted-foreground">
                  Google calendars are connected from the calendar view. More
                  providers will be added here.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
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
            </div>
          </section>

          <section v-if="isCreator" id="archive" class="scroll-mt-20 space-y-3">
            <div class="flex items-center gap-2">
              <ArchiveIcon class="h-4 w-4 text-muted-foreground" />
              <h2 class="text-sm font-semibold text-foreground">Archive</h2>
            </div>
            <div
              class="flex flex-col gap-3 rounded-xl border border-border bg-card px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
            >
              <div class="min-w-0">
                <p class="text-sm font-medium text-foreground">Archive this project</p>
                <p class="mt-0.5 text-sm text-muted-foreground">
                  Hide the board from the sidebar. You can restore it from Archive.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                @click="
                  modalsStore.openModal('archiveProject', {
                    projectId: project.id,
                    projectTitle: project.name,
                  })
                "
              >
                Archive
              </Button>
            </div>
          </section>
        </div>
      </div>
    </div>
  </div>
</template>
