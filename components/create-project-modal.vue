<script setup lang="ts">
import { PlusIcon } from 'lucide-vue-next'
import { useToast } from '@/components/ui/toast/use-toast'
import * as z from 'zod'
import { toTypedSchema } from '@vee-validate/zod'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

const props = defineProps ({
  workspaceId: {
    type: String,
    required: true
  }
})

const { toast } = useToast ()

const formSchema = toTypedSchema (z.object ({
  name: z
    .string ()
    .min (2, "Project name must be at least 2 characters")
    .max (50, "Project name cannot be more than 50 characters")
}))

async function onSubmit(values: any) {
  const { data, error } = await useFetch ('/api/workspaces', {
    method: 'POST',
    body: JSON.stringify ({
      name: values.name,
      workspaceId: props.workspaceId,
      description: 'This is a project description'
    })
  })

  if (error.value) {
    toast ({
      title: 'Uh oh!',
      description: 'Something went wrong. Please try again.',
      variant: 'destructive'
    })
  }
  await refreshNuxtData ('home')
  toast ({
    title: 'Success!',
    description: 'Project created successfully.'
  })
}
</script>

<template>
  <Form v-slot="{ handleSubmit }" as="" keep-values :validation-schema="formSchema">
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
          <div class="bg-yellow-100 px-4 py-6 rounded-md text-sm text-yellow-800 mb-4">
            <p>
              Projects are a great way to organize your work. You can create multiple projects within a workspace.
            </p>
          </div>
          <form id="dialogForm" @submit="handleSubmit($event, onSubmit)">
            <FormField v-slot="{ componentField }" name="name">
              <FormItem>
                <FormLabel>
                  Project Name
                </FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    placeholder="Eg: Marketing Campaign"
                    v-bind="componentField"
                  />
                </FormControl>
                <FormDescription>
                  The name of your project. This will be visible to your team members.
                </FormDescription>
                <FormMessage />
              </FormItem>
            </FormField>
          </form>
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
            form="dialogForm"
            type="submit"
          >
            Create Project
          </Button>
        </div>
      </template>
    </BaseDialog>
  </Form>
</template>
