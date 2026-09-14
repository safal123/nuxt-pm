<script setup lang="ts">
const userStore = useUserStore();
const workspaceId = userStore.user?.activeWorkspaceId;
const userId = userStore.user?.id;

if (workspaceId && userId) {
  await navigateTo(`/w/${workspaceId}/members/${userId}`, { replace: true });
} else {
  await navigateTo("/w", { replace: true });
}
</script>
