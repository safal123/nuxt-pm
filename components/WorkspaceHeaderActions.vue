<script setup lang="ts">
import {
  LinkIcon,
  MoreHorizontalIcon,
  PlusIcon,
  UsersIcon,
} from "lucide-vue-next";
import NotificationBell from "~/components/notifications/NotificationBell.vue";

const { openInvite, openCreateProject, workspaceId } = useWorkspaceLayout();
</script>

<template>
  <div class="flex shrink-0 items-center gap-1.5">
    <NotificationBell />
    <ThemeToggle />

    <div class="hidden items-center gap-1.5 md:flex">
      <Button variant="outline" size="sm" as-child>
        <NuxtLink
          :to="{ name: 'workspace-members', params: { workspaceId } }"
        >
          <UsersIcon />
          Members
        </NuxtLink>
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
        <DropdownMenuItem as-child>
          <NuxtLink
            :to="{ name: 'workspace-members', params: { workspaceId } }"
          >
            <UsersIcon />
            Members
          </NuxtLink>
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
</template>
