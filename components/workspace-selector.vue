<script setup lang="ts">
import { Check, ChevronsUpDown, GalleryVerticalEnd } from "lucide-vue-next";
import type { Workspace } from "@/types";
import type { PropType } from "vue";
import { formatDistance } from "date-fns";
const props = defineProps({
  workspaces: {
    type: Array as PropType<Workspace[]>,
    required: true,
  },
  activeWorkspaceId: {
    type: String,
    required: true,
  },
  activeWorkspace: {
    type: Object as PropType<Workspace>,
    required: false,
    default: null,
  },
});

const workspaceStore = useWorkspaceStore();
const userStore = useUserStore();

const handleWorkspaceSelect = async (workspace: Workspace) => {
  await userStore.updateUser({
    activeWorkspaceId: workspace.id,
    activeProjectId: workspace?.projects?.[0]?.id || null,
  });
  await workspaceStore.setActiveWorkspace(workspace.id);
  await userStore.me();
};
</script>

<template>
  <SidebarMenu>
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <SidebarMenuButton
            size="lg"
            class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
          >
            <div
              class="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground"
            >
              <GalleryVerticalEnd class="size-4" />
            </div>
            <div class="flex flex-col gap-0.5 leading-none">
              <span>{{ activeWorkspace?.name || "Select Workspace" }}</span>
              <span v-if="activeWorkspace?.createdAt" class="text-xs text-muted-foreground">
                Joined
                {{
                  formatDistance(
                    new Date(activeWorkspace.createdAt),
                    new Date(),
                  )
                }}
              </span>
            </div>
            <ChevronsUpDown class="ml-auto size-4" />
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          class="w-[--reka-dropdown-menu-trigger-width] min-w-[240px]"
          align="center"
        >
          <DropdownMenuItem
            v-for="workspace in workspaces"
            :key="workspace.id"
            @select="handleWorkspaceSelect(workspace)"
          >
            {{ workspace.name }}
            <Check v-if="workspace.id === activeWorkspaceId" class="ml-auto" />
          </DropdownMenuItem>
          <DropdownMenuItem @select.prevent>
            <CreateWorkspaceModal />
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  </SidebarMenu>
</template>
