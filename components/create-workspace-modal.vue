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
        variant="ghost"
        class="p-0 w-full border border-dashed bg-purple-700 text-purple-100 hover:bg-purple-800 hover:text-purple-50"
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
