<script setup lang="ts">
import { ref } from 'vue'

definePageMeta ({
  middleware: ['auth']
})

const search = ref ('')
const { data } = await useFetch ('/api/users')
console.log (data.value)
</script>

<template>
  <SidebarProvider>
    <Sidebar>
      <div>
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <WorkspaceSelector :workspaces="data.workspaces"/>
            </SidebarMenuItem>
          </SidebarMenu>
          <SearchInput/>
          <div class="px-2">
            <CreateProjectModal :workspace-id="data.workspaces[0].id"/>
          </div>
        </SidebarHeader>
        <SidebarProjects v-if="data && data?.workspaces" :projects="data?.workspaces[0]?.projects"/>
        <SidebarRail/>
      </div>
    </Sidebar>

    <SidebarInset>
      <header class="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger class="-ml-1"/>
        <Separator orientation="vertical" class="mr-2 h-4"/>
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem class="hidden md:block">
              <BreadcrumbLink href="#">
                Building Your Application
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator class="hidden md:block"/>
            <BreadcrumbItem>
              <BreadcrumbPage>Data Fetching</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div class="ml-auto">
          <UserButton/>
        </div>
      </header>
      <pre>
        {{ data }}
      </pre>
      <ClerkLoading>
        <div class="flex flex-1 flex-col gap-4 p-4">
          <div class="grid auto-rows-min gap-4 md:grid-cols-3">
            <div class="aspect-video rounded-xl bg-muted/50"/>
            <div class="aspect-video rounded-xl bg-muted/50"/>
            <div class="aspect-video rounded-xl bg-muted/50"/>
          </div>
          <div class="min-h-[100vh] flex-1 rounded-xl bg-muted/50 md:min-h-min"/>
        </div>
      </ClerkLoading>
    </SidebarInset>
  </SidebarProvider>
</template>
