<script setup lang="ts">
import { Check, ChevronsUpDown, GalleryVerticalEnd, PlusIcon } from 'lucide-vue-next'
import { ref } from 'vue'

const props = defineProps({
  workspaces: {
    type: Object,
    required: true
  },
  activeWorkspaceId: {
    type: String,
    required: true
  }
})

const selectedVersion = ref(props.activeWorkspaceId)
const dropdownOpen = ref(false)

// Remove manual toggle function
const setSelectedVersion = async (id) => {
  selectedVersion.value = id
  if (selectedVersion.value === props.activeWorkspaceId) return
  // update users active workspace
  const {data} = await useFetch(`/api/users`, {
    method: 'PUT',
    body: JSON.stringify({ activeWorkspaceId: id })
  })
}

const activeWorkspace = () => {
  return props.workspaces.find(workspace => workspace.id === selectedVersion.value) || { name: 'Select Workspace' }
}
</script>

<template>
  <DropdownMenu v-model:open="dropdownOpen">
    <DropdownMenuTrigger as-child>
      <SidebarMenuButton
        size="lg"
        :class="{ 'data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground': dropdownOpen }"
      >
        <div
          class="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
          <GalleryVerticalEnd class="size-4"/>
        </div>
        <div class="flex flex-col gap-0.5 leading-none">
          <span class="font-semibold">
            {{ activeWorkspace().name }}
          </span>
        </div>
        <ChevronsUpDown class="ml-auto"/>
      </SidebarMenuButton>
    </DropdownMenuTrigger>
    <DropdownMenuContent
      class="w-[--radix-dropdown-menu-trigger-width]"
      align="start"
    >
      <DropdownMenuItem
        v-for="workspace in workspaces"
        :key="workspace.id"
        @select="setSelectedVersion(workspace.id)"
      >
        <span>{{ workspace.name }}</span>
        <Check v-if="workspace.id === selectedVersion" class="ml-auto"/>
      </DropdownMenuItem>
      <DropdownMenuItem @select.prevent>
        <CreateWorkspaceModal />
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>ß