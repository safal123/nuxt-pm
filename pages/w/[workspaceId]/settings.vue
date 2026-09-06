<script setup lang="ts">
import { toast } from "vue-sonner";
import { formatDate } from "@/utils/date";
import {
  BellIcon,
  Columns3Icon,
  SunIcon,
  Table2Icon,
  UsersIcon,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { WorkspaceSetting } from "@/types";
import { WORKSPACE_COLORS } from "@/utils/task-colors";

definePageMeta({
  layout: "dashboard",
  name: "workspace-settings",
  middleware: "workspace",
});

const userStore = useUserStore();
const workspaceStore = useWorkspaceStore();
const { preference, setPreference } = useTheme();
const { view, setView } = useProjectView();
const { showEmailsInActivity } = useAppSettings();

const user = computed(() => userStore.user);
const workspace = computed(() => workspaceStore.activeWorkspace);
const members = computed(() => workspaceStore.members);
const settings = computed(
  () =>
    workspace.value?.settings ?? {
      emailOnInvite: true,
      emailOnProjectAdd: true,
      weekStartsOnMonday: true,
      backgroundColor: null,
    },
);
const isOwner = computed(
  () => !!user.value && workspace.value?.createdBy === user.value.id,
);
const saving = ref(false);

const createdLabel = computed(() => {
  const value = workspace.value?.createdAt;
  return value ? formatDate(value) ?? "—" : "—";
});

const ownerLabel = computed(() => {
  const creator = workspace.value?.creator;
  if (!creator) return "—";
  return creator.name || creator.email;
});

const projectCount = computed(
  () =>
    (workspace.value?.projects ?? []).filter((project) => !project.archivedAt)
      .length,
);

const onTheme = (value: unknown) => {
  if (value === "light" || value === "dark" || value === "auto") {
    setPreference(value);
  }
};

const saveSetting = async (patch: Partial<WorkspaceSetting>) => {
  if (!isOwner.value) return;
  saving.value = true;
  try {
    await workspaceStore.updateSettings(patch);
  } catch (error: any) {
    toast.error("Could not save workspace settings", {
      description: error?.data?.message || "Please try again.",
    });
  } finally {
    saving.value = false;
  }
};

const usingBackground = computed(() => !!settings.value.backgroundColor);

const toggleBackground = async (enabled: boolean) => {
  await saveSetting({
    backgroundColor: enabled ? settings.value.backgroundColor || "white" : null,
  });
};

const setBackgroundColor = async (colorId: string) => {
  if (settings.value.backgroundColor === colorId) return;
  await saveSetting({ backgroundColor: colorId });
};
</script>

<template>
  <div class="h-full min-w-0 overflow-y-auto">
    <div class="mb-6">
      <h1 class="text-lg font-semibold tracking-tight text-foreground">
        Settings
      </h1>
      <p class="mt-1 text-sm text-muted-foreground">
        Personal appearance stays on this device. Workspace settings are stored
        for everyone in {{ workspace?.name || "this workspace" }}.
      </p>
    </div>

    <div class="mx-auto w-full space-y-8 pb-10">
      <section class="space-y-3">
        <div class="flex items-center gap-2">
          <SunIcon class="h-4 w-4 text-muted-foreground" />
          <h2 class="text-sm font-semibold text-foreground">Appearance</h2>
        </div>
        <div class="overflow-hidden rounded-xl border border-border bg-card">
          <div
            class="flex flex-col gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
          >
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

          <div
            class="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div class="min-w-0">
              <p class="text-sm font-medium text-foreground">
                Default task view
              </p>
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
          <BellIcon class="h-4 w-4 text-muted-foreground" />
          <h2 class="text-sm font-semibold text-foreground">Your activity</h2>
        </div>
        <div class="overflow-hidden rounded-xl border border-border bg-card">
          <div class="flex items-center justify-between gap-4 px-4 py-4">
            <div class="min-w-0">
              <p class="text-sm font-medium text-foreground">
                Emails in activity
              </p>
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
          <h2 class="text-sm font-semibold text-foreground">
            Workspace settings
          </h2>
        </div>

        <div class="overflow-hidden rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow class="hover:bg-transparent border-border">
                <TableHead class="h-10 w-[220px]">Setting</TableHead>
                <TableHead class="h-10">Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow class="hover:bg-transparent">
                <TableCell class="align-top text-sm text-muted-foreground">
                  Name
                </TableCell>
                <TableCell class="text-sm font-medium text-foreground">
                  {{ workspace?.name || "—" }}
                </TableCell>
              </TableRow>
              <TableRow class="hover:bg-transparent">
                <TableCell class="align-top text-sm text-muted-foreground">
                  Description
                </TableCell>
                <TableCell class="text-sm text-foreground">
                  {{ workspace?.description || "—" }}
                </TableCell>
              </TableRow>
              <TableRow class="hover:bg-transparent">
                <TableCell class="align-top text-sm text-muted-foreground">
                  Owner
                </TableCell>
                <TableCell class="text-sm text-foreground">
                  {{ ownerLabel }}
                </TableCell>
              </TableRow>
              <TableRow class="hover:bg-transparent">
                <TableCell class="align-top text-sm text-muted-foreground">
                  Your role
                </TableCell>
                <TableCell class="text-sm text-foreground">
                  {{ isOwner ? "Owner" : "Member" }}
                </TableCell>
              </TableRow>
              <TableRow class="hover:bg-transparent">
                <TableCell class="align-top text-sm text-muted-foreground">
                  Members
                </TableCell>
                <TableCell class="text-sm text-foreground">
                  {{ members.length }}
                </TableCell>
              </TableRow>
              <TableRow class="hover:bg-transparent">
                <TableCell class="align-top text-sm text-muted-foreground">
                  Projects
                </TableCell>
                <TableCell class="text-sm text-foreground">
                  {{ projectCount }}
                </TableCell>
              </TableRow>
              <TableRow class="hover:bg-transparent">
                <TableCell class="align-top text-sm text-muted-foreground">
                  Created
                </TableCell>
                <TableCell class="text-sm text-foreground">
                  {{ createdLabel }}
                </TableCell>
              </TableRow>
              <TableRow class="hover:bg-transparent">
                <TableCell class="align-top">
                  <p class="text-sm text-muted-foreground">Invite emails</p>
                  <p class="mt-0.5 text-xs text-muted-foreground">
                    Send mail when someone is invited to the workspace.
                  </p>
                </TableCell>
                <TableCell>
                  <Switch
                    :checked="settings.emailOnInvite"
                    :disabled="!isOwner || saving"
                    @update:checked="saveSetting({ emailOnInvite: $event })"
                  />
                </TableCell>
              </TableRow>
              <TableRow class="hover:bg-transparent">
                <TableCell class="align-top">
                  <p class="text-sm text-muted-foreground">Project add emails</p>
                  <p class="mt-0.5 text-xs text-muted-foreground">
                    Email people when they are added to a project.
                  </p>
                </TableCell>
                <TableCell>
                  <Switch
                    :checked="settings.emailOnProjectAdd"
                    :disabled="!isOwner || saving"
                    @update:checked="saveSetting({ emailOnProjectAdd: $event })"
                  />
                </TableCell>
              </TableRow>
              <TableRow class="hover:bg-transparent">
                <TableCell class="align-top">
                  <p class="text-sm text-muted-foreground">
                    Week starts on Monday
                  </p>
                  <p class="mt-0.5 text-xs text-muted-foreground">
                    Used by the date picker when choosing due dates.
                  </p>
                </TableCell>
                <TableCell>
                  <Switch
                    :checked="settings.weekStartsOnMonday"
                    :disabled="!isOwner || saving"
                    @update:checked="
                      saveSetting({ weekStartsOnMonday: $event })
                    "
                  />
                </TableCell>
              </TableRow>
              <TableRow class="hover:bg-transparent">
                <TableCell class="align-top">
                  <p class="text-sm text-muted-foreground">Background color</p>
                  <p class="mt-0.5 text-xs text-muted-foreground">
                    Tint the dashboard for everyone in this workspace.
                  </p>
                </TableCell>
                <TableCell>
                  <div class="flex flex-col gap-3">
                    <Switch
                      :checked="usingBackground"
                      :disabled="!isOwner || saving"
                      @update:checked="toggleBackground"
                    />
                    <div
                      v-if="usingBackground"
                      class="flex flex-wrap gap-1.5"
                    >
                      <button
                        v-for="color in WORKSPACE_COLORS"
                        :key="color.id"
                        type="button"
                        class="h-6 w-6 rounded-full ring-offset-2"
                        :class="[
                          settings.backgroundColor === color.id
                            ? 'ring-2 ring-foreground'
                            : 'hover:opacity-90',
                          color.id === 'white' ? 'border border-border' : '',
                        ]"
                        :style="{ backgroundColor: color.value }"
                        :title="color.name"
                        :disabled="!isOwner || saving"
                        @click="setBackgroundColor(color.id)"
                      />
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
        <p v-if="!isOwner" class="text-xs text-muted-foreground">
          Only the workspace owner can change these controls.
        </p>
      </section>

      <section class="space-y-3">
        <h2 class="text-sm font-semibold text-foreground">Your account</h2>
        <div class="overflow-hidden rounded-xl border border-border bg-card">
          <div
            class="grid gap-1 border-b border-border px-4 py-4 sm:grid-cols-[140px_1fr]"
          >
            <p class="text-sm text-muted-foreground">Name</p>
            <p class="text-sm font-medium text-foreground">
              {{ user?.name || "—" }}
            </p>
          </div>
          <div class="grid gap-1 px-4 py-4 sm:grid-cols-[140px_1fr]">
            <p class="text-sm text-muted-foreground">Email</p>
            <p class="text-sm font-medium text-foreground">
              {{ user?.email || "—" }}
            </p>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
