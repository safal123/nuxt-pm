<script setup lang="ts">
import { LinkIcon, PlusIcon, UsersIcon } from "lucide-vue-next";

const workspaceStore = useWorkspaceStore();
const userStore = useUserStore();
const modalsStore = useModalsStore();
// @ts-ignore
await userStore.me();
// @ts-ignore
await workspaceStore.fetchWorkspaces();
</script>

<template>
  <SidebarProvider>
    <Sidebar>
      <SidebarHeader class="border-b px-4 py-2">
        <WorkspaceSelector
          :workspaces="workspaceStore.workspaces"
          :active-workspace-id="userStore.user?.activeWorkspaceId || ''"
          :active-workspace="workspaceStore.activeWorkspace || undefined"
          class="w-full"
        />
      </SidebarHeader>

      <SidebarContent class="">
        <SidebarProjects
          :active-project-id="userStore.user?.activeProjectId || ''"
          :projects="workspaceStore.getActiveWorkspace?.projects || []"
        />
      </SidebarContent>

      <SidebarFooter class="border-t p-4">
        <AppUserButton />
      </SidebarFooter>
    </Sidebar>

    <SidebarInset class="min-w-0 overflow-hidden">
      <header class="flex h-14 items-center gap-4 border-b px-6">
        <SidebarTrigger class="-ml-2" />
        <div class="flex-1">
          <Breadcrumb>
            <BreadcrumbItem>{{
              workspaceStore?.activeWorkspace?.name
            }}</BreadcrumbItem>
            <BreadcrumbItem>/</BreadcrumbItem>
            <BreadcrumbItem>Dashboard</BreadcrumbItem>
          </Breadcrumb>
        </div>
        <div class="flex items-center gap-2">
          <ThemeToggle />
          <Button
            variant="outline"
            @click="modalsStore.openModal('workspaceMembers')"
          >
            <UsersIcon class="w-4 h-4" />
            Members
          </Button>
          <Button
            variant="outline"
            @click="modalsStore.openModal('workspaceInvite')"
          >
            <LinkIcon class="w-4 h-4" />
            Invite
          </Button>
          <Button
            @click="
              modalsStore.openModal('createProject', {
                workspaceId: userStore.user?.activeWorkspaceId,
              })
            "
          >
            <PlusIcon class="w-4 h-4" />
            Create Project
          </Button>
          <CreateProjectModal />
          <WorkspaceMembersModal />
          <WorkspaceInviteModal />
          <AppUserButton />
        </div>
      </header>

      <ClerkLoading>
        <div class="flex flex-1 flex-col gap-4 p-6">
          <div class="grid gap-4 md:grid-cols-3">
            <Skeleton class="h-[120px] rounded-xl" />
            <Skeleton class="h-[120px] rounded-xl" />
            <Skeleton class="h-[120px] rounded-xl" />
          </div>
          <Skeleton class="h-[400px] rounded-xl" />
        </div>
      </ClerkLoading>

      <ClerkLoaded>
        <main class="p-6 flex-1 min-w-0 overflow-hidden">
          <slot />
        </main>
      </ClerkLoaded>
    </SidebarInset>
  </SidebarProvider>
</template>
