<script setup lang="ts">
const workspaceStore = useWorkspaceStore();
const userStore = useUserStore();
const { workspaceBackground, sidebarBackground, pageTitle, initialize } =
  useWorkspaceLayout();

await initialize();
</script>

<template>
  <SidebarProvider>
    <Sidebar :style="sidebarBackground">
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

    <SidebarInset class="min-w-0 overflow-hidden" :style="workspaceBackground">
      <header
        class="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b px-3 backdrop-blur md:px-6"
        :class="
          workspaceBackground
            ? 'bg-background/55 supports-[backdrop-filter]:bg-background/40'
            : 'bg-background/95 supports-[backdrop-filter]:bg-background/80'
        "
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
                {{ pageTitle }}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <WorkspaceHeaderActions />
      </header>

      <WorkspaceModals />

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
