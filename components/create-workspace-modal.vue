<script setup lang="ts">
import { PlusIcon } from "lucide-vue-next";
import { toast } from "vue-sonner";
import { toTypedSchema } from "@vee-validate/zod";
import { workspaceCreateSchema } from "~/server/utils/schemas";

const workspaceStore = useWorkspaceStore();
const userStore = useUserStore();
const creating = ref(false);
const open = ref(false);

const formSchema = toTypedSchema(workspaceCreateSchema.pick({ name: true }));

const close = () => {
  if (creating.value) return;
  open.value = false;
};

const onOpen = (value: boolean) => {
  if (value) open.value = true;
  else close();
};

async function onSubmit(values: any) {
  if (creating.value) return;
  creating.value = true;
  try {
    const workspace = await workspaceStore.createWorkspace({ name: values.name });
    await userStore.updateUser({ activeWorkspaceId: workspace.id });
    await workspaceStore.setActiveWorkspace(workspace.id);
    toast.success("Workspace created");
    open.value = false;
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
  <Dialog :open="open" @update:open="onOpen">
    <DialogTrigger as-child>
      <button
        type="button"
        class="flex h-7 w-full items-center gap-1.5 rounded-md border border-dashed border-border px-2 text-left text-[12px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <PlusIcon class="size-3.5" />
        Add workspace
      </button>
    </DialogTrigger>
    <DialogContent class="max-w-[500px]">
      <DialogHeader>
        <DialogTitle>Create workspace</DialogTitle>
        <DialogDescription>
          Add a workspace to switch between teams and boards.
        </DialogDescription>
      </DialogHeader>

      <Form v-slot="{ handleSubmit }" as="" :validation-schema="formSchema">
        <form
          id="createWorkspaceForm"
          class="mt-4"
          @submit="handleSubmit($event, onSubmit)"
        >
          <FormField v-slot="{ componentField }" name="name">
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="My workspace"
                  v-bind="componentField"
                  :disabled="creating"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>
        </form>
      </Form>

      <DialogFooter class="mt-4">
        <Button
          type="button"
          variant="outline"
          :disabled="creating"
          @click="close"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          size="xs"
          form="createWorkspaceForm"
          :disabled="creating"
        >
          {{ creating ? "Creating…" : "Create workspace" }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
