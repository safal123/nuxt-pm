<script setup lang="ts">
import {
  LinkIcon,
  MoreHorizontalIcon,
  PlusIcon,
  UsersIcon,
} from "lucide-vue-next";

const workspaceStore = useWorkspaceStore();
const userStore = useUserStore();
const modalsStore = useModalsStore();
// @ts-ignore
await userStore.me();
// @ts-ignore
await workspaceStore.fetchWorkspaces();

const openMembers = () => modalsStore.openModal("workspaceMembers");
const openInvite = () => modalsStore.openModal("workspaceInvite");
const openCreateProject = () =>
  modalsStore.openModal("createProject", {
    workspaceId: userStore.user?.activeWorkspaceId,
  });
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

      <SidebarContent>
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
      <header
        class="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:px-6"
      >
        <SidebarTrigger class="-ml-1 shrink-0" />
        <Separator orientation="vertical" class="hidden h-4 sm:block" />

        <Breadcrumb class="min-w-0 flex-1">
          <BreadcrumbList class="flex-nowrap">
            <BreadcrumbItem class="hidden min-w-0 max-w-[40%] sm:block">
              <BreadcrumbPage class="block truncate text-muted-foreground">
                {{ workspaceStore.activeWorkspace?.name || "Workspace" }}
              </BreadcrumbPage>
            </BreadcrumbItem>
            <BreadcrumbSeparator class="hidden sm:block" />
            <BreadcrumbItem class="min-w-0">
              <BreadcrumbPage class="block truncate font-medium">
                {{
                  $route.path.startsWith("/dashboard/archived")
                    ? "Archive"
                    : $route.path.startsWith("/dashboard/activities")
                      ? "Activities"
                      : $route.path.startsWith("/dashboard/emails")
                        ? "Emails"
                        : $route.path.startsWith("/dashboard/settings")
                          ? "Settings"
                          : "Dashboard"
                }}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div class="flex shrink-0 items-center gap-1.5">
          <ThemeToggle />

          <div class="hidden items-center gap-1.5 md:flex">
            <Button variant="outline" size="sm" @click="openMembers">
              <UsersIcon />
              Members
            </Button>
            <Button variant="outline" size="sm" @click="openInvite">
              <LinkIcon />
              Invite
            </Button>
            <Button size="sm" @click="openCreateProject">
              <PlusIcon />
              Create Project
            </Button>
          </div>

          <Tooltip>
            <TooltipTrigger as-child>
              <Button
                size="icon"
                class="md:hidden"
                aria-label="Create project"
                @click="openCreateProject"
              >
                <PlusIcon />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Create project</TooltipContent>
          </Tooltip>

          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <Button
                variant="outline"
                size="icon"
                class="md:hidden"
                aria-label="More actions"
              >
                <MoreHorizontalIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" class="w-48">
              <DropdownMenuItem @click="openMembers">
                <UsersIcon />
                Members
              </DropdownMenuItem>
              <DropdownMenuItem @click="openInvite">
                <LinkIcon />
                Invite
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div class="md:hidden">
            <AppUserButton />
          </div>
        </div>
      </header>

      <CreateProjectModal />
      <DeleteProjectModal />
      <WorkspaceMembersModal />
      <WorkspaceInviteModal />

      <ClerkLoading>
        <div class="flex flex-1 flex-col gap-4 p-4 md:p-6">
          <div class="grid gap-4 md:grid-cols-3">
            <Skeleton class="h-[120px] rounded-xl" />
            <Skeleton class="h-[120px] rounded-xl" />
            <Skeleton class="h-[120px] rounded-xl" />
          </div>
          <Skeleton class="h-[400px] rounded-xl" />
        </div>
      </ClerkLoading>

      <ClerkLoaded>
        <main class="min-w-0 flex-1 overflow-hidden p-4 md:p-6">
          <slot />
        </main>
      </ClerkLoaded>
    </SidebarInset>
  </SidebarProvider>
</template>
