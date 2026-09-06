<script setup lang="ts">
definePageMeta({
  layout: "dashboard",
  middleware: "workspace",
});

const route = useRoute();
const workspaceStore = useWorkspaceStore();
const userStore = useUserStore();

const workspaceId = computed(() => String(route.params.workspaceId || ""));

const syncWorkspace = async (id: string) => {
  if (!id) return;
  if (!workspaceStore.workspaces.length) {
    await workspaceStore.fetchWorkspaces();
  }
  const match = workspaceStore.workspaces.find((workspace) => workspace.id === id);
  if (!match) return;
  if (workspaceStore.activeWorkspaceId !== id) {
    await workspaceStore.setActiveWorkspace(id);
  }
  if (userStore.user?.activeWorkspaceId !== id) {
    await userStore.updateUser({ activeWorkspaceId: id });
  }
};

await syncWorkspace(workspaceId.value);

watch(workspaceId, (id) => {
  syncWorkspace(id);
});
</script>

<template>
  <NuxtPage />
</template>
