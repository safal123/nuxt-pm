<script setup lang="ts">
import { PlusIcon } from "lucide-vue-next";
import { toast } from "vue-sonner";

const workspaceStore = useWorkspaceStore();
const userStore = useUserStore();
const name = ref("");
const creating = ref(false);

const createWorkspace = async () => {
  const trimmed = name.value.trim();
  if (!trimmed || creating.value) return;
  creating.value = true;
  try {
    const workspace = await workspaceStore.createWorkspace({ name: trimmed });
    await userStore.updateUser({ activeWorkspaceId: workspace.id });
    await workspaceStore.setActiveWorkspace(workspace.id);
    name.value = "";
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
};
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
      <div class="py-4">
        <Input
          label="Workspace Name"
          placeholder="My Awesome Workspace"
          v-model="name"
          :disabled="creating"
        />
      </div>
    </template>
    <template #footer>
      <div class="flex gap-4">
        <DialogClose as-child>
          <Button size="sm" variant="destructive" :disabled="creating"> Cancel </Button>
        </DialogClose>
        <Button
          size="sm"
          :disabled="creating || !name.trim()"
          @click.prevent="createWorkspace"
        >
          {{ creating ? "Creating..." : "Create" }}
        </Button>
      </div>
    </template>
  </BaseDialog>
</template>
