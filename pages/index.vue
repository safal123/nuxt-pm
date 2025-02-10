<script setup lang="ts">
import { ref } from 'vue'

definePageMeta ({
  middleware: ['auth']
})

const search = ref ('')
const { data, status } = await useAsyncData ('home', () => $fetch ('/api/users'))

</script>

<template>
  <SidebarProvider>
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <WorkspaceSelector
              :workspaces="data.workspaces"
              :active-workspace-id="data.user.activeWorkspaceId"
            />
          </SidebarMenuItem>
        </SidebarMenu>
        <SearchInput/>
        <div class="px-2 mt-2">
          <CreateProjectModal :workspace-id="data.workspaces[0].id"/>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarProjects v-if="data && data?.workspaces" :projects="data?.workspaces[0]?.projects"/>
      </SidebarContent>
      <SidebarFooter>
        <div class="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg flex gap-2">
          <UserButton/>
          <p class="text-xs text-gray-700 dark:text-gray-300">
            {{ data.user.email }} <br>
            <span class="text-xs text-gray-500 dark:text-gray-400">{{ data.user.name }}</span>
          </p>
        </div>
      </SidebarFooter>
    </Sidebar>

    <SidebarInset>
      <header class="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger class="-ml-1"/>
        <div class="ml-auto">
          <UserButton/>
        </div>
      </header>
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
