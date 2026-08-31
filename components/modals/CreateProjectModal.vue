<script setup lang="ts">
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useModalsStore } from "@/stores/modals";
import { toTypedSchema } from "@vee-validate/zod";
import * as z from "zod";
import { toast } from "vue-sonner";
import { useWorkspaceStore } from "@/stores/workspace";
import { useUserStore } from "@/stores/user";

const store = useModalsStore();
const workspaceStore = useWorkspaceStore();
const userStore = useUserStore();

const isCreateProjectModalOpen = computed(
  () => store.isOpen && store.modalName === "createProject",
);
const formSchema = toTypedSchema(
  z.object({
    name: z.string().refine((value) => value.trim().length > 0, {
      message: "Project name is required",
    }),
  }),
);

async function onSubmit(values: any) {
  const { data, error } = await useFetch("/api/projects", {
    method: "POST",
    body: JSON.stringify({
      name: values.name,
      workspaceId: store.modalProps.workspaceId,
      description: "This is a project description",
    }),
  });

  if (error.value) {
    toast.error("Uh oh!", {
      description: "Something went wrong. Please try again.",
    });
    return;
  }

  await workspaceStore.fetchWorkspaces();

  const project = (data.value as any)?.data?.project;
  if (project) {
    // Activate the new project immediately so its kanban board shows up.
    await userStore.updateUser({ activeProjectId: project.id });
  }

  store.closeModal();
  toast.success("Success!", {
    description: "Project created successfully.",
  });
}
</script>

<template>
  <Form
    v-slot="{ handleSubmit }"
    as=""
    keep-values
    :validation-schema="formSchema"
  >
    <Dialog
      :open="isCreateProjectModalOpen"
      @interactOutside="store.closeModal"
      @update:open="store.closeModal"
    >
      <DialogContent class="max-w-2xl">
        <DialogHeader>
          <DialogTitle> Create Project </DialogTitle>
        </DialogHeader>
        <div class="py-4">
          <div
            class="bg-amber-50/90 dark:bg-amber-950/30 px-4 py-6 rounded-md text-sm text-amber-800 dark:text-amber-200 mb-4"
          >
            <p class="text-sm text-amber-700 dark:text-amber-300">
              Projects are a great way to organize your work. You can create
              multiple projects within a workspace.
            </p>
          </div>
          {{ store.modalProps }}
          <form id="createProjectForm" @submit="handleSubmit($event, onSubmit)">
            <FormField v-slot="{ componentField }" name="name">
              <FormItem>
                <FormLabel> Project Name </FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    placeholder="Eg: Marketing Campaign"
                    v-bind="componentField"
                  />
                </FormControl>
                <FormDescription>
                  The name of your project. This will be visible to your team
                  members.
                </FormDescription>
                <FormMessage />
              </FormItem>
            </FormField>
          </form>
        </div>
        <DialogFooter class="sm:justify-start">
          <div class="flex gap-4">
            <Button
              @click="store.closeModal()"
              type="button"
              variant="destructive"
            >
              Cancel
            </Button>
            <Button form="createProjectForm" type="submit">
              Create Project
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </Form>
</template>
