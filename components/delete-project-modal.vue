<script setup lang="ts">
import { Trash2Icon, AlertTriangleIcon } from 'lucide-vue-next'
import { useToast } from '@/components/ui/toast/use-toast'

const props = defineProps({
  projectId: {
    type: String,
    required: true
  }
})

const { toast } = useToast()

const handleDelete = async () => {
  const { data, error } = await useFetch(`/api/projects/${props.projectId}`, {
    method: 'DELETE'
  })

  if (error.value) {
    toast({
      title: 'Uh oh!',
      description: 'Something went wrong. Please try again.',
      variant: 'destructive'
    })
    return
  }
  await refreshNuxtData ('home')
  toast({
    title: 'Success!',
    description: 'Project deleted successfully.'
  })
}
</script>

<template>
  <BaseDialog
    title="Delete Project"
    description="Are you sure you want to delete this project? This action cannot be undone."
  >
    <template #trigger>
      Delete Project
    </template>

    <template #body>
      <div class="space-y-4">
        <div class="flex items-center gap-3 p-4 bg-red-100 border border-red-300 rounded-lg text-sm text-red-700">
          <AlertTriangleIcon class="h-12 w-12 text-red-600" />
          <p>
            <strong>Warning:</strong> Deleting this project is irreversible. All associated data will be permanently removed from your account.
            To confirm, please type the project name below.
          </p>
        </div>

        <Input
          label="Project Name"
          class="w-full"
          placeholder="Type the project name to confirm"
        />
      </div>
    </template>

    <template #footer>
      <DialogClose>
        <Button variant="secondary">Cancel</Button>
      </DialogClose>
      <Button variant="destructive" class="flex items-center gap-2" @click="handleDelete">
        <Trash2Icon class="h-4 w-4" />
        Delete
      </Button>
    </template>
  </BaseDialog>
</template>
