<script setup lang="ts">
import { Check, ChevronsUpDown, GalleryVerticalEnd } from 'lucide-vue-next'
import { ref } from 'vue'

const props = defineProps({
  workspaces: {
    type: Object,
    required: true
  }
})

const selectedVersion = ref('')
const dropdownOpen = ref(false)

// Remove manual toggle function
const setSelectedVersion = (id) => {
  selectedVersion.value = id
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
    </DropdownMenuContent>
  </DropdownMenu>
</template>ß