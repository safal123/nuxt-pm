<script setup lang="ts">
import {
  ChevronsUpDownIcon,
  LinkIcon,
  LogOutIcon,
  SunIcon,
  UserIcon,
  UsersIcon,
} from "lucide-vue-next";
import { authClient } from "~/lib/auth-client";

withDefaults(
  defineProps<{
    variant?: "compact" | "sidebar";
  }>(),
  { variant: "compact" },
);

const route = useRoute();
const { user, clearSession } = useAuth();
const userStore = useUserStore();
const modalsStore = useModalsStore();
const { preference, setPreference } = useTheme();

const workspaceId = computed(() => String(route.params.workspaceId || ""));
const inWorkspace = computed(() => Boolean(workspaceId.value));

const initials = computed(() => {
  const source = user.value?.name || user.value?.email || "";
  return (
    source
      .split(/[\s@._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?"
  );
});

const signingOut = ref(false);

const onTheme = (value: string) => {
  if (value === "light" || value === "dark" || value === "auto") {
    setPreference(value);
  }
};

const openInvite = () => modalsStore.openModal("workspaceInvite");

async function handleSignOut() {
  if (signingOut.value) return;
  signingOut.value = true;
  await authClient.signOut();
  clearSession();
  userStore.clearUser();
  await navigateTo("/sign-in");
}
</script>

<template>
  <Dialog v-if="user">
    <DropdownMenu>
      <DropdownMenuTrigger
        v-if="variant === 'compact'"
        class="inline-flex items-center justify-center rounded-full outline-none ring-offset-2 ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Open account menu"
      >
        <Avatar class="!size-8 shrink-0">
          <AvatarImage
            v-if="user.image"
            :src="user.image"
            :alt="user.name ?? ''"
          />
          <AvatarFallback class="text-[11px] font-medium">
            {{ initials }}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>

      <SidebarMenu v-else>
        <SidebarMenuItem>
          <DropdownMenuTrigger as-child>
            <SidebarMenuButton
              size="lg"
              class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              aria-label="Open account menu"
            >
              <Avatar class="!size-8 shrink-0">
                <AvatarImage
                  v-if="user.image"
                  :src="user.image"
                  :alt="user.name ?? ''"
                />
                <AvatarFallback class="text-[11px] font-medium">
                  {{ initials }}
                </AvatarFallback>
              </Avatar>
              <div class="grid min-w-0 flex-1 text-left text-sm leading-tight">
                <span class="truncate font-medium">
                  {{ user.name || "Account" }}
                </span>
                <span class="truncate text-xs text-muted-foreground">
                  {{ user.email }}
                </span>
              </div>
              <ChevronsUpDownIcon class="ml-auto size-4 shrink-0" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
        </SidebarMenuItem>
      </SidebarMenu>

      <DropdownMenuContent
        :side="variant === 'sidebar' ? 'top' : 'bottom'"
        :align="variant === 'sidebar' ? 'start' : 'end'"
        :class="variant === 'sidebar' ? 'w-[--radix-dropdown-menu-trigger-width] min-w-56' : 'w-60'"
      >
        <DropdownMenuLabel class="flex items-center gap-3 p-2 font-normal">
          <Avatar class="!size-9 shrink-0">
            <AvatarImage
              v-if="user.image"
              :src="user.image"
              :alt="user.name ?? ''"
            />
            <AvatarFallback class="text-xs font-medium">
              {{ initials }}
            </AvatarFallback>
          </Avatar>
          <div class="min-w-0">
            <p v-if="user.name" class="truncate text-sm font-medium leading-none">
              {{ user.name }}
            </p>
            <p
              class="truncate text-xs text-muted-foreground"
              :class="user.name ? 'mt-1.5' : ''"
            >
              {{ user.email }}
            </p>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem as-child>
          <NuxtLink
            :to="
              userStore.user?.activeWorkspaceId && userStore.user?.id
                ? `/w/${userStore.user.activeWorkspaceId}/members/${userStore.user.id}`
                : '/profile'
            "
          >
            <UserIcon />
            View profile
          </NuxtLink>
        </DropdownMenuItem>

        <DialogTrigger as-child>
          <DropdownMenuItem>
            <UserIcon />
            Manage account
          </DropdownMenuItem>
        </DialogTrigger>

        <template v-if="inWorkspace">
          <DropdownMenuSeparator />

          <DropdownMenuItem as-child>
            <NuxtLink
              :to="{ name: 'workspace-members', params: { workspaceId } }"
            >
              <UsersIcon />
              Members
            </NuxtLink>
          </DropdownMenuItem>

          <DropdownMenuItem @select="openInvite">
            <LinkIcon />
            Invite
          </DropdownMenuItem>
        </template>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger class="gap-2">
            <SunIcon class="size-4 shrink-0" />
            Appearance
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent class="w-40">
            <DropdownMenuRadioGroup
              :model-value="preference"
              @update:model-value="onTheme"
            >
              <DropdownMenuRadioItem value="light">Light</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="dark">Dark</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="auto">System</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator />

        <DropdownMenuItem :disabled="signingOut" @select="handleSignOut">
          <LogOutIcon />
          {{ signingOut ? "Signing out…" : "Sign out" }}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>

    <ManageAccountModal />
  </Dialog>
</template>
