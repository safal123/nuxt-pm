<script setup lang="ts">
import {
  BriefcaseIcon,
  Calendar1Icon,
  ChartPieIcon,
  ClipboardIcon,
  CodeIcon,
  CreditCardIcon,
  HomeIcon
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
  <SidebarContent>
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
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  </SidebarContent>
</template>

<style scoped></style>
