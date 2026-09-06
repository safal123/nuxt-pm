<script setup lang="ts">
const boardStore = useBoardStore();
const task = computed(() => boardStore.selectedTask);
</script>

<template>
  <FileAttachments
    v-if="task"
    attachable-type="Task"
    :attachable-id="task.id"
    :owner-id="task.createdBy"
    :files="task.attachments"
    subject="this card"
    @changed="boardStore.refreshTask(task.id)"
  />
</template>
