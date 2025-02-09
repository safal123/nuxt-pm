<script setup lang="ts">
import { PlusIcon } from 'lucide-vue-next'
import { useToast } from '@/components/ui/toast/use-toast'

const props = defineProps ({
  workspaceId: {
    type: String,
    required: true
  }
})

const { toast } = useToast ()

const createProject = async () => {
  const { data, status, error } = await useFetch ('/api/workspaces', {
    method: 'POST',
    body: JSON.stringify ({
      name: 'My Awesome Project',
      workspaceId: props.workspaceId,
      description: 'This is a project description',
    })
  })

  if (error.value) {
    toast ({
      title: 'Uh oh!',
      description: 'Something went wrong. Please try again.',
      variant: 'destructive'
    })
  }
  // close the dialog
  this.$emit ('close')
  // reload the page
  window.location.reload ()
}
</script>

<template>
  <BaseDialog
    title="Create Project"
  >
    <template #trigger>
      <Button
        size="sm"
        variant="solid"
        class="p-2 w-full border border-dashed border-gray-300 bg-gray-100 hover:bg-gray-200 text-gray-800"
      >
        <PlusIcon class="h-4 w-4 mr-2"/>
        New Project
      </Button>
    </template>
    <template #body>
      <div class="py-4">
        <Input
          label="Project Name"
          placeholder="My Awesome Project"
        />
      </div>
    </template>
    <template #footer>
      <div class="flex gap-4">
        <DialogClose as-child>
          <Button
            size="sm"
            variant="destructive"
          >
            Cancel
          </Button>
        </DialogClose>
        <Button
          size="sm"
          :disabled="status === 'pending'"
          @click="createProject"
        >
          {{ status === 'pending' ? 'Creating...' : 'Create' }}
        </Button>
      </div>
    </template>
  </BaseDialog>
</template>
