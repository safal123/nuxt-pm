<script setup lang="ts">
const workspaceStore = useWorkspaceStore();
const userStore = useUserStore();
const { pageTitle, initialize } = useWorkspaceLayout();
const { consume } = useBillingReturn();

await initialize();
await consume();
</script>

<template>
  <SidebarProvider>
    <Sidebar>
      <SidebarHeader class="border-b">
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

      <SidebarFooter class="border-t">
        <AppUserButton variant="sidebar" />
      </SidebarFooter>
    </Sidebar>

    <SidebarInset class="min-w-0 overflow-hidden">
      <header
        class="sticky top-0 z-20 flex h-12 shrink-0 items-center gap-2 border-b bg-background/95 px-3 text-[13px] backdrop-blur supports-[backdrop-filter]:bg-background/80 md:px-4"
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

      <main class="app-page min-w-0 flex-1 overflow-hidden p-3 md:p-4">
        <slot />
      </main>
    </SidebarInset>
  </SidebarProvider>
</template>
