<script setup lang="ts">
import { FolderPlusIcon } from "lucide-vue-next";
import { toast } from "vue-sonner";
import { toTypedSchema } from "@vee-validate/zod";
import * as z from "zod";

const store = useModalsStore();
const workspaceStore = useWorkspaceStore();
const userStore = useUserStore();

const creating = ref(false);
const formKey = ref(0);

const open = computed(
  () => store.isOpen && store.modalName === "createProject",
);

watch(open, (value) => {
  if (!value) return;
  creating.value = false;
  formKey.value += 1;
});

const formSchema = toTypedSchema(
  z.object({
    name: z.string().trim().min(1, "Project name is required"),
    description: z.string().optional(),
  }),
);

const close = () => {
  if (creating.value) return;
  store.closeModal();
};

async function onSubmit(values: any) {
  if (creating.value) return;
  creating.value = true;

  try {
    const result = await $fetch<{ data: { project: { id: string } } }>(
      "/api/projects",
      {
        method: "POST",
        body: {
          name: values.name.trim(),
          workspaceId: store.modalProps.workspaceId,
          description: values.description?.trim() || undefined,
        },
      },
    );

    await workspaceStore.fetchWorkspaces();

    const project = result?.data?.project;
    if (project) {
      await userStore.updateUser({ activeProjectId: project.id });
      const workspaceId = String(store.modalProps.workspaceId || "");
      if (workspaceId) {
        await navigateTo({
          name: "workspace-project",
          params: { workspaceId, projectId: project.id },
        });
      }
    }

    store.closeModal();
    toast.success("Project created", {
      description: `${values.name.trim()} is ready to use.`,
    });
  } catch (error: any) {
    toast.error("Could not create project", {
      description: error?.data?.message || "Please try again.",
    });
  } finally {
    creating.value = false;
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
            <FolderPlusIcon class="h-5 w-5 text-foreground" />
          </div>
          <div class="space-y-1.5 text-left">
            <DialogTitle>Create project</DialogTitle>
            <DialogDescription>
              Add a project to this workspace. You can invite people and start a
              board after it is created.
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <Form
        :key="formKey"
        v-slot="{ handleSubmit }"
        as=""
        :validation-schema="formSchema"
      >
        <form
          id="createProjectForm"
          class="space-y-4"
          @submit="handleSubmit($event, onSubmit)"
        >
          <FormField v-slot="{ componentField }" name="name">
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input
                  type="text"
                  placeholder="Marketing campaign"
                  v-bind="componentField"
                  :disabled="creating"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>

          <FormField v-slot="{ componentField }" name="description">
            <FormItem>
              <FormLabel>
                Description
                <span class="font-normal text-muted-foreground">(optional)</span>
              </FormLabel>
              <FormControl>
                <Input
                  type="text"
                  placeholder="What is this project for?"
                  v-bind="componentField"
                  :disabled="creating"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>
        </form>
      </Form>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          :disabled="creating"
          @click="close"
        >
          Cancel
        </Button>
        <Button type="submit" form="createProjectForm" :disabled="creating">
          <FolderPlusIcon class="h-4 w-4" />
          {{ creating ? "Creating…" : "Create project" }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
