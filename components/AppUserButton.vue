<script setup lang="ts">
import { UserButton } from "@clerk/vue";

const clerkAppearance = useClerkAppearance();

const MenuItems = UserButton.MenuItems;
const Action = UserButton.Action;
const UserProfilePage = UserButton.UserProfilePage;
</script>

<template>
  <UserButton after-sign-out-url="/sign-in" :appearance="clerkAppearance">
    <MenuItems>
      <Action label="Open help" open="help">
        <template #labelIcon>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <path d="M12 17h.01" />
          </svg>
        </template>
      </Action>
    </MenuItems>

    <UserProfilePage label="Help" url="help">
      <template #labelIcon>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <path d="M12 17h.01" />
        </svg>
      </template>
      <div class="p-6 space-y-4 text-sm leading-6">
        <h1 class="text-xl font-semibold">Help</h1>
        <p>
          Use the sidebar to switch workspaces and projects. The dashboard can
          show tasks as a board or as a table.
        </p>
        <ul class="list-disc pl-5 space-y-1">
          <li>Invite teammates with a secure link from Invite.</li>
          <li>Click a card or table row to open task details.</li>
          <li>Members can be added to a workspace, project, or task.</li>
        </ul>
      </div>
    </UserProfilePage>
  </UserButton>
</template>
