<script setup lang="ts">
import { PlusIcon } from "lucide-vue-next";

const name = ref("");

const createWorkspace = async () => {
  try {
    const { data, status } = await useFetch("/api/workspaces", {
      method: "POST",
      body: {
        name: name.value,
        description: "My Awesome Workspace Description",
      },
    });
    console.log(data);
  } catch (error) {
    console.error(error);
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
        />
      </div>
    </template>
    <template #footer>
      <div class="flex gap-4">
        <DialogClose as-child>
          <Button size="sm" variant="destructive"> Cancel </Button>
        </DialogClose>
        <Button
          size="sm"
          :disabled="status === 'pending'"
          @click.prevent="createWorkspace"
        >
          {{ status === "pending" ? "Creating..." : "Create" }}
        </Button>
      </div>
    </template>
  </BaseDialog>
</template>
