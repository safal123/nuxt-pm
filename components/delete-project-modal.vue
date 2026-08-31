<script setup lang="ts">
import { AlertTriangleIcon, Trash2Icon } from "lucide-vue-next";
import { toast } from "vue-sonner";
import { toTypedSchema } from "@vee-validate/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const props = defineProps({
  projectId: {
    type: String,
    required: true,
  },
  projectTitle: {
    type: String,
    required: true,
  },
});

const open = ref(false);
const deleting = ref(false);
const userStore = useUserStore();
const workspaceStore = useWorkspaceStore();

const formSchema = toTypedSchema(
  z.object({
    confirm: z.string().refine((value) => value === props.projectTitle, {
      message: "Project name does not match",
    }),
  }),
);

async function onSubmit() {
  if (deleting.value) return;
  deleting.value = true;

  try {
    await $fetch(`/api/projects/${props.projectId}`, { method: "DELETE" });

    const wasActive = userStore.user?.activeProjectId === props.projectId;
    await workspaceStore.fetchWorkspaces();

    if (wasActive) {
      const nextProject = workspaceStore.getActiveWorkspace?.projects?.[0];
      await userStore.updateUser({ activeProjectId: nextProject?.id ?? null });
    }

    open.value = false;
    toast.success("Success!", {
      description: "Project deleted successfully.",
    });
  } catch {
    toast.error("Uh oh!", {
      description: "Something went wrong. Please try again.",
    });
  } finally {
    deleting.value = false;
  }
}
</script>

<template>
  <Form v-slot="{ handleSubmit }" keep-values :validation-schema="formSchema">
    <Dialog :open="open" @update:open="open = $event">
      <DialogTrigger as-child>
        <Button variant="outline" size="sm" class="w-full">
          <Trash2Icon class="h-4 w-4" />
          Delete Project
        </Button>
      </DialogTrigger>

      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>Delete Project</DialogTitle>
        </DialogHeader>

        <div class="space-y-6">
          <div
            class="flex items-start gap-4 p-4 bg-destructive/10 border border-destructive/30 rounded-lg"
          >
            <AlertTriangleIcon class="h-5 w-5 text-destructive mt-0.5" />
            <div class="space-y-2 text-sm text-destructive">
              <p class="font-medium">Irreversible Action</p>
              <p class="text-destructive/90">
                All associated data will be permanently removed. To confirm,
                type the project name below.
              </p>
              <div class="bg-destructive/15 px-3 py-2 rounded-md mt-2">
                <span class="font-mono text-destructive">{{ projectTitle }}</span>
              </div>
            </div>
          </div>
          <form id="deleteProjectForm" @submit="handleSubmit($event, onSubmit)">
            <FormField v-slot="{ componentField }" name="confirm">
              <FormItem>
                <FormLabel>Confirm Project Name</FormLabel>
                <FormControl>
                  <Input
                    v-bind="componentField"
                    placeholder="Enter project name"
                    class="focus-visible:ring-1"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>
          </form>
        </div>

        <DialogFooter>
          <div class="flex justify-end gap-3">
            <DialogClose as-child>
              <Button variant="secondary" :disabled="deleting">Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              type="submit"
              form="deleteProjectForm"
              :disabled="deleting"
            >
              <Trash2Icon class="h-4 w-4" />
              {{ deleting ? "Deleting..." : "Delete Project" }}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </Form>
</template>
