<script setup lang="ts">
import { toast } from "vue-sonner";
import { toTypedSchema } from "@vee-validate/zod";
import { formatDate } from "@/utils/date";
import { subdomainCheckSchema } from "~/server/utils/schemas";
import {
  BellIcon,
  GlobeIcon,
  SunIcon,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { WorkspaceSetting } from "@/types";

definePageMeta({
  layout: "dashboard",
  name: "workspace-settings",
  middleware: "workspace",
});

const userStore = useUserStore();
const workspaceStore = useWorkspaceStore();
const { preference, setPreference } = useTheme();
const { showEmailsInActivity } = useAppSettings();

const user = computed(() => userStore.user);
const workspace = computed(() => workspaceStore.activeWorkspace);
const members = computed(() => workspaceStore.members);
const settings = computed(
  () =>
    workspace.value?.settings ?? {
      emailOnInvite: true,
      emailOnProjectAdd: true,
      emailReminders: true,
      weekStartsOnMonday: true,
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

const savingReminders = ref(false);
const setReminderEmails = async (reminderEmails: boolean) => {
  savingReminders.value = true;
  try {
    await userStore.updateUser({ reminderEmails });
    toast.success(reminderEmails ? "Reminder emails on" : "Reminder emails off");
  } catch (error: any) {
    toast.error(error?.data?.message || "Could not update reminder emails");
  } finally {
    savingReminders.value = false;
  }
};

const route = useRoute();
const {
  enabled: subdomainsEnabled,
  appDomain,
  subdomainUrl,
  goToSubdomain,
} = useSubdomain();

const subdomain = computed(() => user.value?.subdomain || "");
const addressLabel = computed(() =>
  subdomainsEnabled && subdomain.value
    ? `${subdomain.value}.${appDomain}`
    : subdomain.value || "—",
);
const canChangeSubdomain = computed(() => !!user.value?.canChangeSubdomain);
const editingSubdomain = ref(false);
const savingSubdomain = ref(false);
const subdomainFormSchema = toTypedSchema(subdomainCheckSchema);

async function onSubdomainSubmit(values: any) {
  if (savingSubdomain.value) return;
  savingSubdomain.value = true;
  try {
    const next = await userStore.updateSubdomain(values.subdomain);
    toast.success("Workspace address updated");
    editingSubdomain.value = false;
    if (next.subdomain) await goToSubdomain(next.subdomain, route.fullPath);
  } catch (error: any) {
    toast.error(error?.data?.message || "Could not change your workspace address");
  } finally {
    savingSubdomain.value = false;
  }
}

</script>

<template>
  <div class="h-full min-w-0 overflow-y-auto">
    <PageHeader
      title="Settings"
      :description="`Personal appearance stays on this device. Workspace settings are stored for everyone in ${workspace?.name || 'this workspace'}.`"
    />

    <div class="mx-auto w-full space-y-8 pb-10">
      <section class="space-y-3">
        <div class="flex items-center gap-2">
          <SunIcon class="h-4 w-4 text-muted-foreground" />
          <h2 class="text-sm font-semibold text-foreground">Appearance</h2>
        </div>
        <div class="overflow-hidden rounded-xl border border-border bg-card">
          <div
            class="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
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
          <div class="flex items-center justify-between gap-4 border-t border-border px-4 py-4">
            <div class="min-w-0">
              <p class="text-sm font-medium text-foreground">Reminder emails</p>
              <p class="mt-0.5 text-sm text-muted-foreground">
                A daily email with tomorrow's events and your cards due, sent
                around 9am{{ user?.timezone ? ` (${user.timezone})` : "" }}.
              </p>
            </div>
            <Switch
              :checked="user?.reminderEmails !== false"
              :disabled="savingReminders"
              @update:checked="setReminderEmails"
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
                  <p class="text-sm text-muted-foreground">Reminder emails</p>
                  <p class="mt-0.5 text-xs text-muted-foreground">
                    Daily digest of upcoming events and cards due.
                  </p>
                </TableCell>
                <TableCell>
                  <Switch
                    :checked="settings.emailReminders"
                    :disabled="!isOwner || saving"
                    @update:checked="saveSetting({ emailReminders: $event })"
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
          <div
            class="grid gap-1 border-b border-border px-4 py-4 sm:grid-cols-[140px_1fr]"
          >
            <p class="text-sm text-muted-foreground">Email</p>
            <p class="text-sm font-medium text-foreground">
              {{ user?.email || "—" }}
            </p>
          </div>
          <div class="grid gap-3 px-4 py-4 sm:grid-cols-[140px_1fr]">
            <div>
              <p class="text-sm text-muted-foreground">Workspace address</p>
              <p class="mt-0.5 text-xs text-muted-foreground">
                Where you land after signing in.
              </p>
            </div>

            <div class="min-w-0 space-y-2">
              <Form
                v-if="editingSubdomain"
                v-slot="{ handleSubmit }"
                as=""
                :validation-schema="subdomainFormSchema"
                :initial-values="{ subdomain }"
              >
                <form
                  class="flex flex-col gap-2 sm:flex-row sm:items-start"
                  @submit="handleSubmit($event, onSubdomainSubmit)"
                >
                  <FormField v-slot="{ componentField }" name="subdomain">
                    <FormItem class="min-w-0 flex-1">
                      <FormControl>
                        <div
                          class="flex h-9 items-center overflow-hidden rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background"
                        >
                          <Input
                            type="text"
                            class="h-full border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                            autocomplete="off"
                            autocapitalize="none"
                            spellcheck="false"
                            v-bind="componentField"
                            :disabled="savingSubdomain"
                          />
                          <span
                            v-if="subdomainsEnabled"
                            class="shrink-0 pr-3 text-sm text-muted-foreground"
                          >
                            .{{ appDomain }}
                          </span>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  </FormField>
                  <div class="flex gap-2">
                    <Button type="submit" size="sm" class="h-9" :disabled="savingSubdomain">
                      {{ savingSubdomain ? "Saving…" : "Save" }}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      class="h-9"
                      :disabled="savingSubdomain"
                      @click="editingSubdomain = false"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </Form>

              <div v-else class="flex flex-wrap items-center gap-3">
                <a
                  v-if="subdomainsEnabled && subdomain"
                  :href="subdomainUrl(subdomain, '/w')"
                  class="inline-flex min-w-0 items-center gap-1.5 text-sm font-medium text-foreground underline-offset-4 hover:underline"
                >
                  <GlobeIcon class="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span class="truncate">{{ addressLabel }}</span>
                </a>
                <span v-else class="text-sm font-medium text-foreground">
                  {{ addressLabel }}
                </span>
                <Button
                  v-if="canChangeSubdomain"
                  size="sm"
                  variant="outline"
                  class="h-8"
                  @click="editingSubdomain = true"
                >
                  Change
                </Button>
              </div>

              <p
                v-if="!canChangeSubdomain && !editingSubdomain"
                class="text-xs text-muted-foreground"
              >
                Changing your address is on Team and Business.
                <NuxtLink
                  v-if="isOwner && workspace"
                  :to="{ name: 'workspace-billing', params: { workspaceId: workspace.id } }"
                  class="font-medium text-foreground underline-offset-4 hover:underline"
                >
                  Upgrade
                </NuxtLink>
              </p>
              <p
                v-else-if="editingSubdomain"
                class="text-xs text-muted-foreground"
              >
                Your old address stops working right away.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
