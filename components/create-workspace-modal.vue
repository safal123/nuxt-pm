<script setup lang="ts">
import { PlusIcon } from 'lucide-vue-next'
import { useToast } from '@/components/ui/toast/use-toast'

const { toast } = useToast ()
</script>

<template>
  <BaseDialog
    title="Create Workspace"
  >
    <template #trigger>
      <Button
        size="sm"
        variant="solid"
        class="w-full border border-dashed border-gray-300 bg-gray-100 hover:bg-gray-200 text-gray-800"
      >
        <PlusIcon class="h-4 w-4 mr-2"/>
        Add Workspace
      </Button>
    </template>
    <template #body>
      <div class="py-4">
        <Input
          label="Workspace Name"
          placeholder="My Awesome Workspace"
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
          @click=""
        >
          {{ status === 'pending' ? 'Creating...' : 'Create' }}
        </Button>
      </div>
    </template>
  </BaseDialog>
</template>
