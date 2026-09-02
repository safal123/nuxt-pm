<script setup lang="ts">
import {
  BellIcon,
  Columns3Icon,
  SettingsIcon,
  SunIcon,
  Table2Icon,
  UsersIcon,
  LinkIcon,
} from "lucide-vue-next";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

definePageMeta({
  layout: "dashboard",
});

const userStore = useUserStore();
const workspaceStore = useWorkspaceStore();
const modalsStore = useModalsStore();
const { preference, setPreference } = useTheme();
const { view, setView } = useProjectView();
const {
  emailOnInvite,
  emailOnProjectAdd,
  showEmailsInActivity,
  weekStartsOnMonday,
  compactTables,
} = useAppSettings();

const user = computed(() => userStore.user);
const workspace = computed(() => workspaceStore.activeWorkspace);
const isOwner = computed(
  () => !!user.value && workspace.value?.createdBy === user.value.id,
);

const onTheme = (value: unknown) => {
  if (value === "light" || value === "dark" || value === "auto") {
    setPreference(value);
  }
};

const openMembers = () => modalsStore.openModal("workspaceMembers");
const openInvite = () => modalsStore.openModal("workspaceInvite");
</script>

<template>
  <div class="h-full min-w-0 overflow-y-auto">
    <div class="mb-6">
      <h1 class="text-lg font-semibold tracking-tight text-foreground">Settings</h1>
      <p class="mt-1 text-sm text-muted-foreground">
        Controls for how the app looks and how you work. More workspace and notification options can land here later.
      </p>
    </div>

    <div class="mx-auto max-w-3xl space-y-8 pb-10">
      <section class="space-y-3">
        <div class="flex items-center gap-2">
          <SunIcon class="h-4 w-4 text-muted-foreground" />
          <h2 class="text-sm font-semibold text-foreground">Appearance</h2>
        </div>
        <div class="overflow-hidden rounded-xl border border-border bg-card">
          <div class="flex flex-col gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div class="min-w-0">
              <p class="text-sm font-medium text-foreground">Theme</p>
              <p class="mt-0.5 text-sm text-muted-foreground">
                Light, dark, or follow the system.
              </p>
            </div>
            <Select :model-value="preference" @update:model-value="onTheme">
              <SelectTrigger class="h-9 w-full sm:w-[180px]">
                <SelectValue placeholder="Theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="auto">System</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div class="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div class="min-w-0">
              <p class="text-sm font-medium text-foreground">Default task view</p>
              <p class="mt-0.5 text-sm text-muted-foreground">
                Board or table when you open a project.
              </p>
            </div>
            <Tabs :model-value="view" @update:model-value="setView">
              <TabsList>
                <TabsTrigger value="board">
                  <span class="inline-flex items-center gap-1.5">
                    <Columns3Icon class="h-3.5 w-3.5" />
                    Board
                  </span>
                </TabsTrigger>
                <TabsTrigger value="table">
                  <span class="inline-flex items-center gap-1.5">
                    <Table2Icon class="h-3.5 w-3.5" />
                    Table
                  </span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </section>

      <section class="space-y-3">
        <div class="flex items-center gap-2">
          <SettingsIcon class="h-4 w-4 text-muted-foreground" />
          <h2 class="text-sm font-semibold text-foreground">Preferences</h2>
        </div>
        <div class="overflow-hidden rounded-xl border border-border bg-card">
          <div class="flex items-center justify-between gap-4 border-b border-border px-4 py-4">
            <div class="min-w-0">
              <p class="text-sm font-medium text-foreground">Compact tables</p>
              <p class="mt-0.5 text-sm text-muted-foreground">
                Tighter row height on Activities, Emails, and Archive.
              </p>
            </div>
            <Switch
              :checked="compactTables"
              @update:checked="compactTables = $event"
            />
          </div>
          <div class="flex items-center justify-between gap-4 px-4 py-4">
            <div class="min-w-0">
              <p class="text-sm font-medium text-foreground">Week starts on Monday</p>
              <p class="mt-0.5 text-sm text-muted-foreground">
                Used by the date picker when choosing due dates.
              </p>
            </div>
            <Switch
              :checked="weekStartsOnMonday"
              @update:checked="weekStartsOnMonday = $event"
            />
          </div>
        </div>
      </section>

      <section class="space-y-3">
        <div class="flex items-center gap-2">
          <BellIcon class="h-4 w-4 text-muted-foreground" />
          <h2 class="text-sm font-semibold text-foreground">Notifications</h2>
        </div>
        <div class="overflow-hidden rounded-xl border border-border bg-card">
          <div class="flex items-center justify-between gap-4 border-b border-border px-4 py-4">
            <div class="min-w-0">
              <p class="text-sm font-medium text-foreground">Invite emails</p>
              <p class="mt-0.5 text-sm text-muted-foreground">
                Send an email when you invite someone to the workspace.
              </p>
            </div>
            <Switch
              :checked="emailOnInvite"
              @update:checked="emailOnInvite = $event"
            />
          </div>
          <div class="flex items-center justify-between gap-4 border-b border-border px-4 py-4">
            <div class="min-w-0">
              <p class="text-sm font-medium text-foreground">Project add emails</p>
              <p class="mt-0.5 text-sm text-muted-foreground">
                Email people when they are added to a project.
              </p>
            </div>
            <Switch
              :checked="emailOnProjectAdd"
              @update:checked="emailOnProjectAdd = $event"
            />
          </div>
          <div class="flex items-center justify-between gap-4 px-4 py-4">
            <div class="min-w-0">
              <p class="text-sm font-medium text-foreground">Emails in activity</p>
              <p class="mt-0.5 text-sm text-muted-foreground">
                Include emails you sent in the Activities list.
              </p>
            </div>
            <Switch
              :checked="showEmailsInActivity"
              @update:checked="showEmailsInActivity = $event"
            />
          </div>
        </div>
      </section>

      <section class="space-y-3">
        <div class="flex items-center gap-2">
          <UsersIcon class="h-4 w-4 text-muted-foreground" />
          <h2 class="text-sm font-semibold text-foreground">Account & workspace</h2>
        </div>
        <div class="overflow-hidden rounded-xl border border-border bg-card">
          <div class="grid gap-1 border-b border-border px-4 py-4 sm:grid-cols-[140px_1fr]">
            <p class="text-sm text-muted-foreground">Name</p>
            <p class="text-sm font-medium text-foreground">
              {{ user?.name || "—" }}
            </p>
          </div>
          <div class="grid gap-1 border-b border-border px-4 py-4 sm:grid-cols-[140px_1fr]">
            <p class="text-sm text-muted-foreground">Email</p>
            <p class="text-sm font-medium text-foreground">
              {{ user?.email || "—" }}
            </p>
          </div>
          <div class="grid gap-1 border-b border-border px-4 py-4 sm:grid-cols-[140px_1fr]">
            <p class="text-sm text-muted-foreground">Workspace</p>
            <p class="text-sm font-medium text-foreground">
              {{ workspace?.name || "—" }}
              <span class="ml-2 text-xs font-normal text-muted-foreground">
                {{ isOwner ? "Owner" : "Member" }}
              </span>
            </p>
          </div>
          <div class="flex flex-wrap gap-2 px-4 py-4">
            <Button variant="outline" size="sm" @click="openMembers">
              <UsersIcon class="h-4 w-4" />
              Members
            </Button>
            <Button variant="outline" size="sm" @click="openInvite">
              <LinkIcon class="h-4 w-4" />
              Invite
            </Button>
          </div>
        </div>
      </section>

      <section class="space-y-3">
        <h2 class="text-sm font-semibold text-foreground">Later</h2>
        <div class="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-4 text-sm text-muted-foreground">
          <p>
            Ready to add here when you need them: workspace rename, notification digest, language, timezone, default due-date reminders, and who can archive or invite.
          </p>
        </div>
      </section>
    </div>
  </div>
</template>
