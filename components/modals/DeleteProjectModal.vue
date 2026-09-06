<script setup lang="ts">
import { ArchiveIcon } from "lucide-vue-next";
import { toast } from "vue-sonner";
import { toTypedSchema } from "@vee-validate/zod";
import * as z from "zod";

const store = useModalsStore();
const userStore = useUserStore();
const workspaceStore = useWorkspaceStore();

const archiving = ref(false);
const formKey = ref(0);

const open = computed(
  () => store.isOpen && store.modalName === "archiveProject",
);

const projectId = computed(() => store.modalProps.projectId as string);
const projectTitle = computed(() => store.modalProps.projectTitle as string);

watch(open, (value) => {
  if (!value) return;
  archiving.value = false;
  formKey.value += 1;
});

const formSchema = computed(() =>
  toTypedSchema(
    z.object({
      confirm: z.string().refine((value) => value === projectTitle.value, {
        message: "Name does not match",
      }),
    }),
  ),
);

const close = () => {
  if (archiving.value) return;
  store.closeModal();
};

async function onSubmit() {
  if (archiving.value) return;
  archiving.value = true;

  const id = projectId.value;
  const title = projectTitle.value;

  try {
    await workspaceStore.updateProject(id, { archived: true });
    await workspaceStore.fetchArchive({ silent: true });

    const wasActive = userStore.user?.activeProjectId === id;
    if (wasActive) {
      const nextProject = workspaceStore.getActiveWorkspace?.projects?.find(
        (project) => !project.archivedAt && project.id !== id,
      );
      await userStore.updateUser({ activeProjectId: nextProject?.id ?? null });
    }

    store.closeModal();
    toast.success("Project archived", {
      description: `${title} can be restored from Archived in the sidebar.`,
    });

    const route = useRoute();
    if (String(route.params.projectId || "") === id) {
      const workspaceId =
        workspaceStore.activeWorkspaceId || userStore.user?.activeWorkspaceId;
      if (workspaceId) {
        await navigateTo({
          name: "workspace-projects",
          params: { workspaceId },
        });
      }
    }
  } catch (error: any) {
    toast.error("Could not archive project", {
      description: error?.data?.message || "Please try again.",
    });
  } finally {
    archiving.value = false;
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="(value) => { if (!value) close() }">
    <DialogContent class="max-w-md">
      <DialogHeader>
        <div class="flex items-start gap-3">
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted"
          >
            <ArchiveIcon class="h-5 w-5 text-foreground" />
          </div>
          <div class="space-y-1.5 text-left">
            <DialogTitle>Archive project</DialogTitle>
            <DialogDescription>
              The project will be hidden from the sidebar. You can restore it
              later. Only you can archive or restore it.
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <div class="space-y-4">
        <p class="text-sm text-foreground">
          Type
          <span class="rounded bg-muted px-1.5 py-0.5 font-medium">
            {{ projectTitle }}
          </span>
          to confirm.
        </p>

        <Form
          :key="formKey"
          v-slot="{ handleSubmit }"
          as=""
          :validation-schema="formSchema"
        >
          <form id="archiveProjectForm" @submit="handleSubmit($event, onSubmit)">
            <FormField v-slot="{ componentField }" name="confirm">
              <FormItem>
                <FormLabel>Project name</FormLabel>
                <FormControl>
                  <Input
                    v-bind="componentField"
                    placeholder="Enter project name"
                    :disabled="archiving"
                    autocomplete="off"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>
          </form>
        </Form>
      </div>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          :disabled="archiving"
          @click="close"
        >
          Cancel
        </Button>
        <Button type="submit" form="archiveProjectForm" :disabled="archiving">
          <ArchiveIcon class="h-4 w-4" />
          {{ archiving ? "Archiving…" : "Archive project" }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
