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
  await navigateTo({
    name: "workspace-dashboard",
    params: { workspaceId: workspace.id },
  });
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
              class="flex aspect-square size-7 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground"
            >
              <GalleryVerticalEnd class="size-3.5" />
            </div>
            <div class="grid min-w-0 flex-1 text-left leading-tight">
              <span class="truncate text-[13px] font-medium">{{
                activeWorkspace?.name || "Select Workspace"
              }}</span>
              <span
                v-if="activeWorkspace?.createdAt"
                class="truncate text-[11px] text-muted-foreground"
              >
                Joined
                {{
                  formatDistance(
                    new Date(activeWorkspace.createdAt),
                    new Date(),
                  )
                }}
              </span>
            </div>
            <ChevronsUpDown class="ml-auto size-3.5" />
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          class="w-[--reka-dropdown-menu-trigger-width] min-w-[240px] rounded-xl p-1"
          align="start"
        >
          <DropdownMenuItem
            v-for="workspace in workspaces"
            :key="workspace.id"
            class="px-2 py-1 text-[13px] [&>svg]:size-3.5"
            @select="handleWorkspaceSelect(workspace)"
          >
            {{ workspace.name }}
            <Check
              v-if="workspace.id === activeWorkspaceId"
              class="ml-auto size-3.5 text-muted-foreground"
            />
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem class="p-0 focus:bg-transparent" @select.prevent>
            <CreateWorkspaceModal />
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  </SidebarMenu>
</template>
