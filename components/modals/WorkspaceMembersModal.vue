<script setup lang="ts">
import { CopyIcon, LinkIcon, UserPlusIcon, XIcon } from "lucide-vue-next";
import { toast } from "vue-sonner";
import type { Member } from "@/types";

const store = useModalsStore();
const workspaceStore = useWorkspaceStore();
const userStore = useUserStore();

const open = computed(
  () => store.isOpen && store.modalName === "workspaceMembers",
);
const email = ref("");
const saving = ref(false);
const creatingLink = ref(false);
const removingId = ref<string | null>(null);
const errorMessage = ref("");
const inviteUrl = ref("");
const inviteCopied = ref(false);

watch(open, async (value) => {
  if (!value) return;
  email.value = "";
  errorMessage.value = "";
  inviteUrl.value = "";
  inviteCopied.value = false;
  const workspaceId = workspaceStore.activeWorkspaceId || userStore.user?.activeWorkspaceId;
  if (workspaceId) await workspaceStore.fetchMembers(workspaceId);
});

const initials = (person: Member) => {
  const name = person.name || person.email || "";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase() || "?";
};

const addMember = async () => {
  if (!email.value.trim()) return;
  saving.value = true;
  errorMessage.value = "";
  try {
    await workspaceStore.addMember(email.value.trim());
    email.value = "";
    toast.success("Member added to the workspace.");
  } catch (error: any) {
    errorMessage.value =
      error?.data?.message || error?.message || "Could not add that member.";
  } finally {
    saving.value = false;
  }
};

const createInviteLink = async () => {
  creatingLink.value = true;
  errorMessage.value = "";
  inviteCopied.value = false;
  try {
    const invite = await workspaceStore.createInvite(email.value.trim() || undefined);
    if (!invite?.url) return;
    inviteUrl.value = invite.url;
    await navigator.clipboard.writeText(invite.url);
    inviteCopied.value = true;
    toast.success(
      email.value.trim()
        ? "Invite link created for that email and copied."
        : "Invite link created and copied. It expires in 72 hours.",
    );
  } catch (error: any) {
    errorMessage.value =
      error?.data?.message || error?.message || "Could not create an invite link.";
  } finally {
    creatingLink.value = false;
  }
};

const copyInvite = async () => {
  if (!inviteUrl.value) return;
  await navigator.clipboard.writeText(inviteUrl.value);
  inviteCopied.value = true;
  toast.success("Invite link copied.");
};

const removeMember = async (person: Member) => {
  if (person.isOwner) return;
  removingId.value = person.id;
  try {
    await workspaceStore.removeMember(person.id);
    toast.success("Member removed from the workspace.");
  } catch (error: any) {
    toast.error(error?.data?.message || "Could not remove that member.");
  } finally {
    removingId.value = null;
  }
};
</script>

<template>
  <Dialog :open="open" @update:open="(value) => { if (!value) store.closeModal() }">
    <DialogContent class="max-w-lg">
      <DialogHeader>
        <DialogTitle>Workspace members</DialogTitle>
      </DialogHeader>

      <p class="text-sm text-muted-foreground">
        Add someone who already has an account by email, or create a secure invite link.
        If you enter an email first, the link will only work for that address.
      </p>

      <form class="flex gap-2 mt-3" @submit.prevent="addMember">
        <input
          v-model="email"
          type="email"
          placeholder="name@example.com (optional for a link)"
          class="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
        />
        <Button type="submit" size="sm" :disabled="!email.trim() || saving">
          <UserPlusIcon class="h-4 w-4 mr-1" />
          Add
        </Button>
      </form>
      <Button
        variant="outline"
        size="sm"
        class="mt-2"
        :disabled="creatingLink"
        @click="createInviteLink"
      >
        <LinkIcon class="h-4 w-4 mr-1" />
        {{ creatingLink ? "Creating…" : "Create invite link" }}
      </Button>
      <p v-if="errorMessage" class="mt-2 text-xs text-red-600">{{ errorMessage }}</p>

      <div v-if="inviteUrl" class="mt-3 flex gap-2">
        <input
          :value="inviteUrl"
          readonly
          class="flex-1 rounded-md border border-input bg-muted px-3 py-2 text-xs text-foreground"
        />
        <Button variant="outline" size="sm" @click="copyInvite">
          <CopyIcon class="h-4 w-4 mr-1" />
          {{ inviteCopied ? "Copied" : "Copy" }}
        </Button>
      </div>

      <div class="mt-4 max-h-[360px] overflow-y-auto space-y-1">
        <div
          v-for="person in workspaceStore.members"
          :key="person.id"
          class="flex items-center gap-3 rounded-lg px-2 py-2"
        >
          <div
            class="h-8 w-8 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300 text-[11px] font-semibold overflow-hidden flex items-center justify-center"
          >
            <img v-if="person.imageUrl" :src="person.imageUrl" class="h-full w-full object-cover" />
            <span v-else>{{ initials(person) }}</span>
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium text-foreground truncate">
              {{ person.name || person.email }}
            </p>
            <p class="text-xs text-muted-foreground truncate">{{ person.email }}</p>
          </div>
          <span
            v-if="person.isOwner"
            class="text-[11px] font-semibold uppercase tracking-wide text-violet-700 bg-violet-50 dark:text-violet-300 dark:bg-violet-500/20 px-2 py-0.5 rounded"
          >
            Owner
          </span>
          <button
            v-else
            type="button"
            class="text-muted-foreground hover:text-red-600 p-1"
            :disabled="removingId === person.id"
            @click="removeMember(person)"
          >
            <XIcon class="h-4 w-4" />
          </button>
        </div>
        <p
          v-if="!workspaceStore.members.length"
          class="text-sm text-muted-foreground py-6 text-center"
        >
          No members yet.
        </p>
      </div>
    </DialogContent>
  </Dialog>
</template>
