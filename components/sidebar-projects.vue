<script setup lang="ts">
import type { Project } from "@/types";
import {
  ArchiveIcon,
  HistoryIcon,
  MailIcon,
  SettingsIcon,
  UsersIcon,
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
const route = useRoute();
const { workspaceId, isOwner } = useWorkspaceLayout();

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
    <SidebarMenu>
      <SidebarMenuItem
        :class="navItemClass(route.path.endsWith('/dashboard'))"
      >
        <SidebarMenuButton v-if="workspaceId" as-child>
          <NuxtLink
            :to="{ name: 'workspace-dashboard', params: { workspaceId } }"
            class="w-full cursor-pointer"
          >
            <LayoutDashboardIcon class="text-sidebar-foreground" />
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
            class="w-full cursor-pointer"
          >
            <FolderKanbanIcon class="text-sidebar-foreground" />
            <span>Projects</span>
          </NuxtLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  </SidebarGroup>

  <SidebarGroup>
    <SidebarGroupLabel>
      <span>Projects</span>
      <button
        type="button"
        class="ml-auto flex size-5 items-center justify-center rounded-md text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
        @click="
          modalsStore.openModal('createProject', {
            workspaceId: workspaceId,
          })
        "
      >
        <PlusIcon class="size-3.5" />
      </button>
    </SidebarGroupLabel>
    <SidebarMenu>
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
          <component :is="projectIcon(item)" class="text-sidebar-foreground" />
          <span>{{ item.name }}</span>
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
            <DropdownMenuItem
              @click="
                navigateTo({
                  name: 'workspace-project-settings',
                  params: { workspaceId: workspaceId, projectId: item.id },
                })
              "
            >
              <SettingsIcon />
              <span>Settings</span>
            </DropdownMenuItem>
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
    <SidebarGroupLabel>Workspace</SidebarGroupLabel>
    <SidebarMenu>
      <SidebarMenuItem
        :class="navItemClass(route.path.includes('/members'))"
      >
        <SidebarMenuButton v-if="workspaceId" as-child>
          <NuxtLink
            :to="{ name: 'workspace-members', params: { workspaceId } }"
            class="w-full cursor-pointer"
          >
            <UsersIcon class="text-sidebar-foreground" />
            <span>People</span>
          </NuxtLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem
        :class="navItemClass(route.path.includes('/activities'))"
      >
        <SidebarMenuButton v-if="workspaceId" as-child>
          <NuxtLink
            :to="{ name: 'workspace-activities', params: { workspaceId } }"
            class="w-full cursor-pointer"
          >
            <HistoryIcon class="text-sidebar-foreground" />
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
            class="w-full cursor-pointer"
          >
            <MailIcon class="text-sidebar-foreground" />
            <span>Emails</span>
          </NuxtLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem
        v-if="isOwner && workspaceId"
        :class="navItemClass(route.path.includes('/billing'))"
      >
        <SidebarMenuButton as-child>
          <NuxtLink
            :to="{ name: 'workspace-billing', params: { workspaceId } }"
            class="w-full cursor-pointer"
          >
            <CreditCardIcon class="text-sidebar-foreground" />
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
            class="w-full cursor-pointer"
          >
            <ArchiveIcon class="text-sidebar-foreground" />
            <span>Archive</span>
          </NuxtLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem
        :class="navItemClass(route.path.includes('/settings') && !route.params.projectId)"
      >
        <SidebarMenuButton v-if="workspaceId" as-child>
          <NuxtLink
            :to="{ name: 'workspace-settings', params: { workspaceId } }"
            class="w-full cursor-pointer"
          >
            <SettingsIcon class="text-sidebar-foreground" />
            <span>Settings</span>
          </NuxtLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  </SidebarGroup>
  </div>
</template>

<style scoped></style>
