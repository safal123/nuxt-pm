<script setup lang="ts">
const workspaceStore = useWorkspaceStore();
const userStore = useUserStore();
const { isTinted, pageTitle, initialize } = useWorkspaceLayout();
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
        class="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b px-3 backdrop-blur md:px-6"
        :class="
          isTinted
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

      <main class="min-w-0 flex-1 overflow-hidden p-4 md:p-6">
        <slot />
      </main>
    </SidebarInset>
  </SidebarProvider>
</template>
