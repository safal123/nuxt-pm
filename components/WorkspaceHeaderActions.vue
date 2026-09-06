<script setup lang="ts">
import {
  LinkIcon,
  MoreHorizontalIcon,
  PlusIcon,
  UsersIcon,
} from "lucide-vue-next";

const { openMembers, openInvite, openCreateProject } = useWorkspaceLayout();
</script>

<template>
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
</template>
