<script setup lang="ts">
import type { Project } from "@/types";
import {
  ArchiveIcon,
  HistoryIcon,
  MailIcon,
  SettingsIcon,
  BriefcaseIcon,
  Calendar1Icon,
  ChartPieIcon,
  ClipboardIcon,
  CodeIcon,
  CreditCardIcon,
  FolderKanbanIcon,
  HomeIcon,
  LayoutDashboardIcon,
  MoreHorizontal,
  Edit2,
  PlusIcon,
} from "lucide-vue-next";

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

const userStore = useUserStore();
const workspaceStore = useWorkspaceStore();
const route = useRoute();
const workspaceId = computed(() =>
  String(
    route.params.workspaceId ||
      workspaceStore.activeWorkspaceId ||
      userStore.user?.activeWorkspaceId ||
      "",
  ),
);

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
  if (projectId !== props.activeProjectId) {
    await userStore.updateUser({ activeProjectId: projectId });
  }
  await navigateTo({
    name: "workspace-project",
    params: {
      workspaceId: workspaceId.value,
      projectId,
    },
  });
};

const { requestRename } = useProjectRename();
const modalsStore = useModalsStore();

const liveProjects = computed(() =>
  props.projects.filter((project) => !project.archivedAt),
);

const isCreator = (project: Project) =>
  project.createdBy === userStore.user?.id;

// Active and idle share the `hover:bg-*` slot, so they are kept exclusive here
// rather than layered as two competing utilities.
const navItemClass = (isActive: boolean) => [
  "flex items-center rounded-md",
  isActive
    ? "bg-sidebar-active hover:bg-sidebar-active-hover"
    : "hover:bg-sidebar-accent",
];

const editProject = async (project: Project) => {
  if (project.id !== props.activeProjectId) {
    await handleSelectProject(project.id);
  }
  requestRename(project.id);
};
</script>

<template>
  <div class="contents">
  <SidebarGroup>
    <SidebarMenu class="px-2 mt-1">
      <SidebarMenuItem
        :class="navItemClass(route.path.endsWith('/dashboard'))"
      >
        <SidebarMenuButton v-if="workspaceId" as-child>
          <NuxtLink
            :to="{ name: 'workspace-dashboard', params: { workspaceId } }"
            class="w-full cursor-pointer flex items-center gap-2 p-2"
          >
            <LayoutDashboardIcon class="h-4 w-4 text-sidebar-foreground" />
            <span>Dashboard</span>
          </NuxtLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem
        :class="
          navItemClass(
            route.path.endsWith('/projects') && !route.params.projectId,
          )
        "
      >
        <SidebarMenuButton v-if="workspaceId" as-child>
          <NuxtLink
            :to="{ name: 'workspace-projects', params: { workspaceId } }"
            class="w-full cursor-pointer flex items-center gap-2 p-2"
          >
            <FolderKanbanIcon class="h-4 w-4 text-sidebar-foreground" />
            <span>Projects</span>
          </NuxtLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  </SidebarGroup>

  <SidebarGroup>
    <SidebarGroupLabel>
      <div class="flex items-center justify-between w-full mb-2">
        <span class="text-sidebar-foreground font-semibold text-[14px]"> Projects </span>
        <PlusIcon
          @click="
            modalsStore.openModal('createProject', {
              workspaceId: workspaceId,
            })
          "
          class="w-6 h-6 text-sidebar-foreground ml-auto bg-sidebar-accent rounded-full p-1 cursor-pointer"
        />
      </div>
    </SidebarGroupLabel>
    <SidebarMenu class="px-2 mt-1">
      <SidebarMenuItem
        v-for="item in liveProjects"
        :key="item.id"
        :class="
          navItemClass(
            item.id === activeProjectId &&
              String(route.params.projectId || '') === item.id,
          )
        "
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
            <DropdownMenuItem @click="editProject(item)">
              <Edit2 />
              <span>Rename</span>
            </DropdownMenuItem>
            <DropdownMenuItem @select.prevent>
              <LazyProjectMembersModal
                :project-id="item.id"
                :workspace-id="item.workspaceId"
              />
            </DropdownMenuItem>
            <DropdownMenuItem
              v-if="isCreator(item)"
              @click="
                modalsStore.openModal('archiveProject', {
                  projectId: item.id,
                  projectTitle: item.name,
                })
              "
            >
              <ArchiveIcon />
              Archive project
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  </SidebarGroup>

  <SidebarGroup>
    <SidebarGroupLabel>
      <div class="flex items-center justify-between w-full mb-2">
        <span class="text-sidebar-foreground font-semibold text-[14px]"> Workspace </span>
      </div>
    </SidebarGroupLabel>
    <SidebarMenu class="px-2 mt-1">
      <SidebarMenuItem
        :class="navItemClass(route.path.includes('/activities'))"
      >
        <SidebarMenuButton v-if="workspaceId" as-child>
          <NuxtLink
            :to="{ name: 'workspace-activities', params: { workspaceId } }"
            class="w-full cursor-pointer flex items-center gap-2 p-2"
          >
            <HistoryIcon class="h-4 w-4 text-sidebar-foreground" />
            <span>Activities</span>
          </NuxtLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem
        :class="navItemClass(route.path.includes('/emails'))"
      >
        <SidebarMenuButton v-if="workspaceId" as-child>
          <NuxtLink
            :to="{ name: 'workspace-emails', params: { workspaceId } }"
            class="w-full cursor-pointer flex items-center gap-2 p-2"
          >
            <MailIcon class="h-4 w-4 text-sidebar-foreground" />
            <span>Emails</span>
          </NuxtLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem
        :class="navItemClass(route.path.includes('/billing'))"
      >
        <SidebarMenuButton v-if="workspaceId" as-child>
          <NuxtLink
            :to="{ name: 'workspace-billing', params: { workspaceId } }"
            class="w-full cursor-pointer flex items-center gap-2 p-2"
          >
            <CreditCardIcon class="h-4 w-4 text-sidebar-foreground" />
            <span>Billing</span>
          </NuxtLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem
        :class="navItemClass(route.path.includes('/archived'))"
      >
        <SidebarMenuButton v-if="workspaceId" as-child>
          <NuxtLink
            :to="{ name: 'workspace-archived', params: { workspaceId } }"
            class="w-full cursor-pointer flex items-center gap-2 p-2"
          >
            <ArchiveIcon class="h-4 w-4 text-sidebar-foreground" />
            <span>Archive</span>
          </NuxtLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem
        :class="navItemClass(route.path.includes('/settings'))"
      >
        <SidebarMenuButton v-if="workspaceId" as-child>
          <NuxtLink
            :to="{ name: 'workspace-settings', params: { workspaceId } }"
            class="w-full cursor-pointer flex items-center gap-2 p-2"
          >
            <SettingsIcon class="h-4 w-4 text-sidebar-foreground" />
            <span>Settings</span>
          </NuxtLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  </SidebarGroup>
  </div>
</template>

<style scoped></style>
