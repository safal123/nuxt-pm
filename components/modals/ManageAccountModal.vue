<script setup lang="ts">
import { toTypedSchema } from "@vee-validate/zod";
import * as z from "zod";
import { toast } from "vue-sonner";
import {
  CameraIcon,
  KeyRoundIcon,
  ShieldIcon,
  UserIcon,
} from "lucide-vue-next";
import { authClient } from "~/lib/auth-client";

const { user, fetchSession } = useAuth();
const userStore = useUserStore();

const tab = ref<"profile" | "security">("profile");
const hasPassword = ref(true);
const hasGoogle = ref(false);

watch(
  () => user.value?.id,
  async (id) => {
    if (!id) return;
    try {
      const { data } = await authClient.listAccounts();
      const accounts = data ?? [];
      hasPassword.value = accounts.some(
        (account) => account.providerId === "credential",
      );
      hasGoogle.value = accounts.some(
        (account) => account.providerId === "google",
      );
    } catch {
      hasPassword.value = true;
      hasGoogle.value = false;
    }
  },
  { immediate: true },
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

/* ---------------------------------- profile --------------------------------- */

const savingProfile = ref(false);

const profileSchema = toTypedSchema(
  z.object({
    name: z.string().trim().min(1, "Name is required"),
  }),
);

async function onSaveProfile(values: any) {
  if (savingProfile.value) return;
  savingProfile.value = true;

  const { error } = await authClient.updateUser({ name: values.name.trim() });
  savingProfile.value = false;

  if (error) {
    toast.error(error.message || "Could not save your profile");
    return;
  }

  await fetchSession();
  await userStore.me({ force: true });
  toast.success("Profile updated");
}

/* ---------------------------------- avatar ---------------------------------- */

const fileInput = ref<HTMLInputElement | null>(null);

const { startUpload, isUploading } = useUploadThing("avatar", {
  onClientUploadComplete: async () => {
    await fetchSession();
    await userStore.me({ force: true });
    toast.success("Photo updated");
  },
  onUploadError: (error: Error) => {
    toast.error(error.message || "Could not upload that photo");
  },
});

async function onPickFile(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  if (!file) return;
  await startUpload([file]);
}

/* --------------------------------- password --------------------------------- */

const changingPassword = ref(false);
const passwordFormKey = ref(0);

const passwordSchema = toTypedSchema(
  z
    .object({
      currentPassword: z.string().min(1, "Current password is required"),
      newPassword: z.string().min(8, "Use at least 8 characters"),
      confirmPassword: z.string().min(1, "Confirm your new password"),
    })
    .refine((values) => values.newPassword === values.confirmPassword, {
      message: "Passwords do not match",
      path: ["confirmPassword"],
    }),
);

async function onChangePassword(values: any) {
  if (changingPassword.value) return;
  changingPassword.value = true;

  const { error } = await authClient.changePassword({
    currentPassword: values.currentPassword,
    newPassword: values.newPassword,
    revokeOtherSessions: true,
  });
  changingPassword.value = false;

  if (error) {
    toast.error(error.message || "Could not change your password");
    return;
  }

  passwordFormKey.value += 1;
  toast.success("Password changed. Other devices were signed out.");
}
</script>

<template>
  <DialogContent
    class="flex h-[min(36rem,calc(100dvh-2rem))] max-w-3xl flex-col gap-0 overflow-hidden p-0 sm:rounded-xl"
  >
    <DialogHeader
      class="space-y-0 border-b border-border px-6 py-4 pr-12 text-left"
    >
      <DialogTitle class="text-base">Account</DialogTitle>
      <DialogDescription>
        Manage your profile, photo, and sign-in methods.
      </DialogDescription>
    </DialogHeader>

    <div class="flex min-h-0 flex-1 flex-col sm:flex-row">
      <nav
        class="flex shrink-0 gap-1 overflow-x-auto border-b border-border p-2 sm:w-48 sm:flex-col sm:border-b-0 sm:border-r sm:p-3"
      >
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors"
          :class="
            tab === 'profile'
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
          "
          @click="tab = 'profile'"
        >
          <UserIcon class="h-4 w-4" />
          Profile
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors"
          :class="
            tab === 'security'
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
          "
          @click="tab = 'security'"
        >
          <ShieldIcon class="h-4 w-4" />
          Security
        </button>
      </nav>

      <div class="min-h-0 flex-1 overflow-y-auto p-6">
        <div v-if="tab === 'profile'" class="space-y-6">
          <div>
            <h3 class="text-sm font-semibold">Profile details</h3>
            <p class="mt-1 text-sm text-muted-foreground">
              Shown on cards, comments, and activity.
            </p>
          </div>

          <div class="flex items-center gap-4">
            <input
              ref="fileInput"
              type="file"
              accept="image/*"
              class="hidden"
              @change="onPickFile"
            />
            <button
              type="button"
              class="group relative shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              :disabled="isUploading"
              aria-label="Change photo"
              @click="fileInput?.click()"
            >
              <Avatar class="!size-20 text-lg">
                <AvatarImage
                  v-if="user?.image"
                  :src="user.image"
                  :alt="user.name ?? ''"
                />
                <AvatarFallback class="text-lg font-medium">
                  {{ initials }}
                </AvatarFallback>
              </Avatar>
              <span
                class="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                <CameraIcon class="h-5 w-5" />
              </span>
            </button>
            <div class="min-w-0">
              <p class="truncate text-sm font-medium">
                {{ user?.name || "Add your name" }}
              </p>
              <p class="truncate text-sm text-muted-foreground">
                {{ user?.email }}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                class="mt-2"
                :disabled="isUploading"
                @click="fileInput?.click()"
              >
                {{ isUploading ? "Uploading…" : "Change photo" }}
              </Button>
            </div>
          </div>

          <Form
            v-slot="{ handleSubmit }"
            as=""
            :validation-schema="profileSchema"
            :initial-values="{ name: user?.name ?? '' }"
          >
            <form
              class="space-y-4"
              @submit="handleSubmit($event, onSaveProfile)"
            >
              <FormField v-slot="{ componentField }" name="name">
                <FormItem>
                  <FormLabel>Full name</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      autocomplete="name"
                      v-bind="componentField"
                      :disabled="savingProfile"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              </FormField>

              <div class="space-y-2">
                <Label>Email</Label>
                <Input :model-value="user?.email ?? ''" type="email" disabled />
                <p class="text-xs text-muted-foreground">
                  Email can’t be changed here.
                </p>
              </div>

              <Button type="submit" :disabled="savingProfile">
                {{ savingProfile ? "Saving…" : "Save changes" }}
              </Button>
            </form>
          </Form>
        </div>

        <div v-else class="space-y-6">
          <div>
            <h3 class="text-sm font-semibold">Security</h3>
            <p class="mt-1 text-sm text-muted-foreground">
              How you sign in to Northstar.
            </p>
          </div>

          <div
            v-if="hasGoogle"
            class="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-3"
          >
            <div class="flex min-w-0 items-center gap-3">
              <span
                class="flex size-9 items-center justify-center rounded-md border border-border bg-background"
              >
                <svg class="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.86c2.26-2.08 3.6-5.15 3.6-8.81z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.96-1.08 7.94-2.92l-3.87-3c-1.07.72-2.44 1.15-4.07 1.15-3.13 0-5.78-2.11-6.72-4.96H1.29v3.09A12 12 0 0 0 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27a7.2 7.2 0 0 1 0-4.54V6.64H1.29a12.01 12.01 0 0 0 0 10.72l3.99-3.09z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.29 6.64l3.99 3.09C6.22 6.86 8.87 4.75 12 4.75z"
                  />
                </svg>
              </span>
              <div class="min-w-0">
                <p class="text-sm font-medium">Google</p>
                <p class="truncate text-xs text-muted-foreground">
                  {{ user?.email }}
                </p>
              </div>
            </div>
            <Badge variant="secondary">Connected</Badge>
          </div>

          <div
            v-if="hasPassword"
            class="rounded-lg border border-border p-4"
          >
            <div class="flex items-start gap-3">
              <span
                class="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-background"
              >
                <KeyRoundIcon class="h-4 w-4" />
              </span>
              <div class="min-w-0 flex-1">
                <h4 class="text-sm font-medium">Password</h4>
                <p class="mt-0.5 text-sm text-muted-foreground">
                  Changing it signs out your other devices.
                </p>

                <Form
                  :key="passwordFormKey"
                  v-slot="{ handleSubmit }"
                  as=""
                  :validation-schema="passwordSchema"
                >
                  <form
                    class="mt-4 space-y-3"
                    @submit="handleSubmit($event, onChangePassword)"
                  >
                    <FormField v-slot="{ componentField }" name="currentPassword">
                      <FormItem>
                        <FormLabel>Current password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            autocomplete="current-password"
                            v-bind="componentField"
                            :disabled="changingPassword"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    </FormField>

                    <FormField v-slot="{ componentField }" name="newPassword">
                      <FormItem>
                        <FormLabel>New password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            autocomplete="new-password"
                            v-bind="componentField"
                            :disabled="changingPassword"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    </FormField>

                    <FormField v-slot="{ componentField }" name="confirmPassword">
                      <FormItem>
                        <FormLabel>Confirm new password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            autocomplete="new-password"
                            v-bind="componentField"
                            :disabled="changingPassword"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    </FormField>

                    <Button type="submit" :disabled="changingPassword">
                      {{ changingPassword ? "Changing…" : "Change password" }}
                    </Button>
                  </form>
                </Form>
              </div>
            </div>
          </div>

          <p
            v-else
            class="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground"
          >
            You sign in with Google, so this account does not have a password.
          </p>
        </div>
      </div>
    </div>
  </DialogContent>
</template>
