<script setup lang="ts">
import {
  BriefcaseIcon,
  Calendar1Icon,
  ChartPieIcon,
  ClipboardIcon,
  CodeIcon,
  CreditCardIcon,
  HomeIcon,
  EllipsisVerticalIcon,
  MoreHorizontal,
  Folder,
  Forward,
  Trash2
} from 'lucide-vue-next'

const props = defineProps ({
  projects: {
    type: Array,
    required: true
  }
})

const randomIcons = () => {
  const icons = [
    HomeIcon,
    BriefcaseIcon,
    Calendar1Icon,
    ChartPieIcon,
    ClipboardIcon,
    CodeIcon,
    CreditCardIcon
  ]

  return icons[Math.floor(Math.random() * icons.length)]
}
</script>

<template>
  <SidebarGroup>
    <SidebarGroupLabel>
      Projects
    </SidebarGroupLabel>
    <SidebarMenu>
      <SidebarMenuItem
        v-for="item in projects"
        :key="item.name"
        class="flex items-center hover:bg-gray-100"
      >
        <SidebarMenuButton as-child>
          <div
            class="w-full cursor-pointer flex items-center gap-2 p-2 mb-1"
          >
            <component :is="randomIcons()" class="h-6 w-6 text-gray-700"/>
            <span>{{ item.name }}</span>
<!--            <EllipsisVerticalIcon class="h-4 w-4 text-gray-500 ml-auto"/>-->
          </div>
        </SidebarMenuButton>
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <SidebarMenuAction show-on-hover>
              <MoreHorizontal />
              <span class="sr-only">More</span>
            </SidebarMenuAction>
          </DropdownMenuTrigger>
          <DropdownMenuContent class="w-48 rounded-lg" side="bottom" align="end">
<!--            <DropdownMenuItem>-->
<!--              <Folder class="text-muted-foreground" />-->
<!--              <span>View Project</span>-->
<!--            </DropdownMenuItem>-->
<!--            <DropdownMenuItem>-->
<!--              <Forward class="text-muted-foreground" />-->
<!--              <span>Share Project</span>-->
<!--            </DropdownMenuItem>-->
<!--            <DropdownMenuSeparator />-->
            <DropdownMenuItem @select.prevent>
              <Trash2 class="text-muted-foreground" />
              <DeleteProjectModal :project-id="item.id"/>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  </SidebarGroup>
</template>

<style scoped></style>
