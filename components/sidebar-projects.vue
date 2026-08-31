<script setup lang="ts">
import type { Project } from "@/types";
import {
  BriefcaseIcon,
  Calendar1Icon,
  ChartPieIcon,
  ClipboardIcon,
  CodeIcon,
  CreditCardIcon,
  HomeIcon,
  MoreHorizontal,
  Edit2,
  PlusIcon,
} from "lucide-vue-next";
import { toast } from "vue-sonner";

const props = defineProps({
  projects: {
    type: Array as PropType<Project[]>,
    required: true,
  },
  activeProjectId: {
    type: String,
    required: true,
  },
});

const workspaceStore = useWorkspaceStore();
const userStore = useUserStore();

const PROJECT_ICONS = [
  HomeIcon,
  BriefcaseIcon,
  Calendar1Icon,
  ChartPieIcon,
  ClipboardIcon,
  CodeIcon,
  CreditCardIcon,
] as const;

const projectIcon = (project: Project) => {
  let hash = 0;
  for (let index = 0; index < project.id.length; index += 1) {
    hash = (hash * 31 + project.id.charCodeAt(index)) >>> 0;
  }
  return PROJECT_ICONS[hash % PROJECT_ICONS.length];
};

const handleSelectProject = async (projectId: string) => {
  if (projectId === props.activeProjectId) return;
  await useFetch(`/api/users`, {
    method: "PUT",
    body: JSON.stringify({ activeProjectId: projectId as string }),
  });
  await userStore.me();
  toast.success("Success!", {
    description: "Project changed successfully.",
  });
};

const modalsStore = useModalsStore();
</script>

<template>
  <SidebarGroup>
    <SidebarGroupLabel>
      <div class="flex items-center justify-between w-full mb-2">
        <span class="text-sidebar-foreground font-semibold text-[14px]"> Projects </span>
        <PlusIcon
          @click="
            modalsStore.openModal('createProject', {
              workspaceId: userStore.user?.activeWorkspaceId,
            })
          "
          class="w-6 h-6 text-sidebar-foreground ml-auto bg-sidebar-accent rounded-full p-1 cursor-pointer"
        />
      </div>
    </SidebarGroupLabel>
    <SidebarMenu class="px-2 mt-1">
      <SidebarMenuItem
        v-for="item in projects"
        :key="item.id"
        class="flex items-center hover:bg-sidebar-accent rounded-md"
        :class="{
          'bg-violet-100 hover:bg-violet-200 dark:bg-violet-500/20 dark:hover:bg-violet-500/30': item.id === activeProjectId,
        }"
      >
        <SidebarMenuButton @click.prevent="handleSelectProject(item.id)">
          <div class="w-full cursor-pointer flex items-center gap-2 p-2">
            <component :is="projectIcon(item)" class="h-4 w-4 text-sidebar-foreground" />
            <span>
              {{
                item.name.length > 15
                  ? item.name.slice(0, 15) + "..."
                  : item.name
              }}
            </span>
          </div>
        </SidebarMenuButton>
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <SidebarMenuAction show-on-hover>
              <MoreHorizontal />
              <span class="sr-only">More</span>
            </SidebarMenuAction>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            class="w-48 rounded-lg"
            side="bottom"
            align="end"
          >
            <DropdownMenuItem @select.prevent>
              <Edit2 />
              <span>Edit</span>
            </DropdownMenuItem>
            <DropdownMenuItem @select.prevent>
              <LazyProjectMembersModal
                :project-id="item.id"
                :workspace-id="item.workspaceId"
              />
            </DropdownMenuItem>
            <DropdownMenuItem @select.prevent>
              <div class="w-full">
                <LazyDeleteProjectModal
                  :project-id="item.id"
                  :project-title="item.name"
                />
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  </SidebarGroup>
</template>

<style scoped></style>
