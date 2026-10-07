<script setup lang="ts">
import {
  BellOffIcon,
  ChevronsUpDownIcon,
  CircleHelpIcon,
  CreditCardIcon,
  LogOutIcon,
  MonitorIcon,
  SettingsIcon,
  Trash2Icon,
  UserIcon,
} from "lucide-vue-next";
import { authClient } from "~/lib/auth-client";
import { useUserStatus } from "~/composables/useUserStatus";

withDefaults(
  defineProps<{
    variant?: "compact" | "sidebar";
  }>(),
  { variant: "compact" },
);

const route = useRoute();
const { user, clearSession } = useAuth();
const { enabled, apexUrl } = useSubdomain();
const userStore = useUserStore();
const { preference, setPreference } = useTheme();
const { status, statusLabel, statusEmoji } = useUserStatus();
const modalsStore = useModalsStore();
const menuOpen = ref(false);

const workspaceId = computed(
  () =>
    String(route.params.workspaceId || "") ||
    userStore.user?.activeWorkspaceId ||
    "",
);

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

const headerInitial = computed(
  () =>
    (user.value?.name || user.value?.email || "?")
      .trim()
      .charAt(0)
      .toUpperCase() || "?",
);

const planLabel = computed(() =>
  userStore.user?.canChangeSubdomain ? "Paid" : "Free",
);

const appearanceLabel = computed(() => {
  if (preference.value === "light") return "Light";
  if (preference.value === "dark") return "Dark";
  return "System";
});

const profileTo = computed(() =>
  userStore.user?.activeWorkspaceId && userStore.user?.id
    ? `/w/${userStore.user.activeWorkspaceId}/members/${userStore.user.id}`
    : "/profile",
);

const billingTo = computed(() =>
  workspaceId.value
    ? {
        name: "workspace-billing" as const,
        params: { workspaceId: workspaceId.value },
      }
    : "/w",
);

const itemClass =
  "w-full gap-2 rounded-lg border border-transparent px-3 py-2 text-left text-[13px] font-normal leading-5 tracking-normal text-[#1C2526] transition-colors duration-150 hover:border-border hover:bg-muted focus:border-border focus:bg-muted focus:text-[#1C2526] dark:text-foreground dark:focus:text-foreground sm:py-1 [&>svg]:size-4";

const signingOut = ref(false);
const muted = ref(false);

const openStatus = () => {
  menuOpen.value = false;
  modalsStore.openModal("setStatus");
};

const onTheme = (value: string) => {
  if (value === "light" || value === "dark" || value === "auto") {
    setPreference(value);
  }
};

async function handleSignOut() {
  if (signingOut.value) return;
  signingOut.value = true;
  await authClient.signOut();
  clearSession();
  userStore.clearUser();
  await navigateTo(apexUrl("/"), { external: enabled });
}
</script>

<template>
  <Dialog v-if="user">
    <DropdownMenu v-model:open="menuOpen">
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
              <Avatar class="!size-7 shrink-0">
                <AvatarImage
                  v-if="user.image"
                  :src="user.image"
                  :alt="user.name ?? ''"
                />
                <AvatarFallback class="text-[10px] font-medium">
                  {{ initials }}
                </AvatarFallback>
              </Avatar>
              <div class="grid min-w-0 flex-1 text-left leading-tight">
                <span class="truncate text-[13px] font-medium">
                  {{ user.name || "Account" }}
                </span>
                <span class="truncate text-[11px] text-muted-foreground">
                  {{ user.email }}
                </span>
              </div>
              <ChevronsUpDownIcon class="ml-auto size-3.5 shrink-0" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
        </SidebarMenuItem>
      </SidebarMenu>

      <DropdownMenuContent
        :side="variant === 'sidebar' ? 'top' : 'bottom'"
        :align="variant === 'sidebar' ? 'start' : 'end'"
        :side-offset="8"
        class="w-[18.75rem] overflow-hidden rounded-2xl border-border/80 bg-popover p-0 text-popover-foreground shadow-[0_12px_40px_rgba(15,23,42,0.12)]"
      >
        <DropdownMenuLabel class="px-3 pb-2.5 pt-3 font-normal">
          <div class="flex items-start gap-2.5">
            <Avatar class="!size-9 shrink-0 rounded-xl" shape="square">
              <AvatarImage
                v-if="user.image"
                :src="user.image"
                :alt="user.name ?? ''"
              />
              <AvatarFallback
                class="rounded-xl bg-[#9d2460] text-[13px] font-semibold text-white"
              >
                {{ headerInitial }}
              </AvatarFallback>
            </Avatar>
            <div class="min-w-0 flex-1">
              <div class="flex min-w-0 items-center gap-1.5">
                <p
                  class="truncate text-[13.5px] font-medium leading-5 text-[#1C2526] dark:text-foreground"
                >
                  {{ user.name || "Account" }}
                </p>
                <span
                  class="inline-flex shrink-0 items-center rounded-full bg-muted px-1.5 py-px text-[10px] font-medium text-muted-foreground"
                >
                  {{ planLabel }}
                </span>
              </div>
              <p class="mt-0.5 truncate text-[12px] leading-4 text-muted-foreground">
                {{ user.email }}
              </p>
            </div>
          </div>

          <button
            type="button"
            class="mt-2.5 flex w-full items-center gap-2 rounded-lg border border-dashed border-border bg-muted/70 px-3 py-1.5 text-left text-[13px] font-normal leading-5 text-[#1C2526] transition-colors duration-150 hover:bg-muted dark:text-foreground"
            @click="openStatus"
          >
            <span v-if="statusEmoji" class="text-[14px] leading-none">{{ statusEmoji }}</span>
            <span
              v-else
              class="size-2 shrink-0 rounded-full"
              :class="
                status.availability === 'offline'
                  ? 'bg-muted-foreground/50'
                  : 'bg-emerald-500'
              "
            />
            <span class="truncate">{{ statusLabel }}</span>
          </button>
        </DropdownMenuLabel>

        <DropdownMenuSeparator class="mx-0 bg-border" />

        <div class="px-1 py-1">
          <DropdownMenuItem as-child :class="itemClass">
            <NuxtLink :to="profileTo">
              <UserIcon />
              My Profile
            </NuxtLink>
          </DropdownMenuItem>

          <DropdownMenuItem as-child :class="itemClass">
            <NuxtLink :to="billingTo">
              <CreditCardIcon />
              Billing & Plans
              <span
                class="ml-auto inline-flex items-center rounded-full bg-muted px-1.5 py-px text-[10px] font-medium text-muted-foreground"
              >
                {{ planLabel }}
              </span>
            </NuxtLink>
          </DropdownMenuItem>

          <DialogTrigger as-child>
            <DropdownMenuItem :class="itemClass">
              <SettingsIcon />
              Settings
            </DropdownMenuItem>
          </DialogTrigger>

          <DropdownMenuItem :class="itemClass" @select.prevent>
            <Trash2Icon />
            Trash
          </DropdownMenuItem>

          <DropdownMenuItem :class="itemClass" @select.prevent="muted = !muted">
            <BellOffIcon />
            Mute notifications
            <Switch
              :checked="muted"
              class="ml-auto shrink-0"
              @click.stop
              @update:checked="muted = $event"
            />
          </DropdownMenuItem>

          <DropdownMenuItem :class="itemClass" @select.prevent>
            <CircleHelpIcon />
            Help & support
          </DropdownMenuItem>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger :class="itemClass">
              <MonitorIcon class="size-4 shrink-0" />
              Appearance
              <span class="ml-auto text-[12px] font-normal text-muted-foreground">
                {{ appearanceLabel }}
              </span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent class="w-36 rounded-xl">
              <DropdownMenuRadioGroup
                :model-value="preference"
                @update:model-value="onTheme"
              >
                <DropdownMenuRadioItem value="light"
                  >Light</DropdownMenuRadioItem
                >
                <DropdownMenuRadioItem value="dark">Dark</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="auto"
                  >System</DropdownMenuRadioItem
                >
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </div>

        <DropdownMenuSeparator class="mx-0 bg-border" />

        <div class="px-1 py-1">
          <DropdownMenuItem
            :class="`${itemClass} text-red-500 hover:bg-red-50 focus:bg-red-50 focus:text-red-500 dark:text-red-400 dark:hover:bg-red-950/40 dark:focus:bg-red-950/40 dark:focus:text-red-400 [&>svg]:text-current`"
            :disabled="signingOut"
            @select="handleSignOut"
          >
            <LogOutIcon class="text-current" />
            {{ signingOut ? "Signing out…" : "Log out" }}
          </DropdownMenuItem>
        </div>

        <div
          class="flex items-center gap-2 border-t border-border px-3 py-2 text-[11px] font-normal text-muted-foreground"
        >
          <span>Desktop</span>
          <span class="inline-flex items-center gap-1.5" aria-hidden="true">
            <svg class="size-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M16.4 12.3c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.2-2.8.9-3.5.9s-1.8-.8-3-.8c-1.5 0-3 .9-3.8 2.3-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.3 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7 2-.1 2.9-2.3c.7-1.1 1-2.1 1-2.2-.1 0-2.3-.9-2.3-3.5zM14.7 5.8c.6-.8 1.1-1.9.9-3-.9.1-2 .6-2.6 1.4-.6.7-1.1 1.8-.9 2.9 1 .1 2-.5 2.6-1.3z"
              />
            </svg>
            <svg class="size-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M3 5.1 10.2 4v7.2H3V5.1zm8.2-.9L21 3v8.2h-9.8V4.2zM3 12.8h7.2V21L3 19.9v-7.1zm8.2 0H21V21l-9.8-1.2v-7z"
              />
            </svg>
            <svg class="size-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M12.54 2.13c.55 1.73-.27 3.37-1.54 4.12-1.38.16-2.86-1.37-2.45-3.07.7-.9 2.5-1.5 3.99-1.05zm8.01 14.4c-.18 3.36-3.03 5.64-4.66 5.64-1.17 0-2.07-.77-3.31-.77-1.28 0-2.09.74-3.36.77-1.7.05-4.4-2.55-5.2-5.86C2.8 12.3 4.6 7.7 7.27 7.7c1.25 0 2.29.82 3.08.82.76 0 1.95-.9 3.4-.77 1.38.06 2.64.79 3.4 2-3.05 1.67-2.56 6.03.4 7.18z"
              />
            </svg>
          </span>
          <span class="h-3 w-px bg-border" />
          <span>Mobile</span>
          <span class="inline-flex items-center gap-1.5" aria-hidden="true">
            <svg class="size-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M16.4 12.3c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.2-2.8.9-3.5.9s-1.8-.8-3-.8c-1.5 0-3 .9-3.8 2.3-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.3 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7 2-.1 2.9-2.3c.7-1.1 1-2.1 1-2.2-.1 0-2.3-.9-2.3-3.5zM14.7 5.8c.6-.8 1.1-1.9.9-3-.9.1-2 .6-2.6 1.4-.6.7-1.1 1.8-.9 2.9 1 .1 2-.5 2.6-1.3z"
              />
            </svg>
            <svg class="size-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M17.6 9.48 19.44 6.3a.44.44 0 0 0-.83-.48l-1.88 3.24a11.3 11.3 0 0 0-8.94 0L5.91 5.82a.44.44 0 1 0-.83.48l1.84 3.18A9.76 9.76 0 0 0 0 19h24a9.76 9.76 0 0 0-6.4-9.52M7 15.25a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5m10 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5"
              />
            </svg>
          </span>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>

    <ManageAccountModal />
  </Dialog>
</template>
