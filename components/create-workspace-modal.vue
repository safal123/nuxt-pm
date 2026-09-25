<script setup lang="ts">
import { PlusIcon } from "lucide-vue-next";
import { toast } from "vue-sonner";
import { toTypedSchema } from "@vee-validate/zod";
import { workspaceCreateSchema } from "~/server/utils/schemas";

const workspaceStore = useWorkspaceStore();
const userStore = useUserStore();
const creating = ref(false);

const formSchema = toTypedSchema(workspaceCreateSchema.pick({ name: true }));

async function onSubmit(values: any) {
  if (creating.value) return;
  creating.value = true;
  try {
    const workspace = await workspaceStore.createWorkspace({ name: values.name });
    await userStore.updateUser({ activeWorkspaceId: workspace.id });
    await workspaceStore.setActiveWorkspace(workspace.id);
    toast.success("Workspace created");
    await navigateTo({
      name: "workspace-dashboard",
      params: { workspaceId: workspace.id },
    });
  } catch (error: any) {
    toast.error(error?.data?.message || "Could not create that workspace.");
  } finally {
    creating.value = false;
  }
}
</script>

<template>
  <BaseDialog title="Create Workspace">
    <template #trigger>
      <Button
        size="sm"
        class="w-full justify-start border border-dashed"
      >
        <PlusIcon class="h-4 w-4" />
        Add Workspace
      </Button>
    </template>
    <template #body>
      <Form v-slot="{ handleSubmit }" as="" :validation-schema="formSchema">
        <form
          id="createWorkspaceForm"
          class="py-4"
          @submit="handleSubmit($event, onSubmit)"
        >
          <FormField v-slot="{ componentField }" name="name">
            <FormItem>
              <FormLabel>Workspace Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="My Awesome Workspace"
                  v-bind="componentField"
                  :disabled="creating"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>
        </form>
      </Form>
    </template>
    <template #footer>
      <div class="flex gap-4">
        <DialogClose as-child>
          <Button size="sm" variant="destructive" :disabled="creating"> Cancel </Button>
        </DialogClose>
        <Button
          size="sm"
          type="submit"
          form="createWorkspaceForm"
          :disabled="creating"
        >
          {{ creating ? "Creating..." : "Create" }}
        </Button>
      </div>
    </template>
  </BaseDialog>
</template>
