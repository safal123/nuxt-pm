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
        <DialogDescription>
          Add someone who already has an account by email, or create a secure invite
          link. If you enter an email first, the link will only work for that address.
        </DialogDescription>
      </DialogHeader>

      <form class="mt-4 flex gap-1.5" @submit.prevent="addMember">
        <Input
          v-model="email"
          type="email"
          placeholder="name@example.com (optional for a link)"
          class="flex-1"
        />
        <Button type="submit" :disabled="!email.trim() || saving">
          <UserPlusIcon />
          Add
        </Button>
      </form>
      <Button
        variant="outline"
        class="mt-1.5"
        :disabled="creatingLink"
        @click="createInviteLink"
      >
        <LinkIcon />
        {{ creatingLink ? "Creating…" : "Create invite link" }}
      </Button>
      <p v-if="errorMessage" class="mt-1.5 text-[12px] text-red-600">{{ errorMessage }}</p>

      <div v-if="inviteUrl" class="mt-2.5 flex gap-1.5">
        <Input
          :model-value="inviteUrl"
          readonly
          class="flex-1 bg-muted"
        />
        <Button variant="outline" @click="copyInvite">
          <CopyIcon />
          {{ inviteCopied ? "Copied" : "Copy" }}
        </Button>
      </div>

      <div class="mt-4 max-h-[360px] space-y-px overflow-y-auto">
        <div
          v-for="person in workspaceStore.members"
          :key="person.id"
          class="flex items-center gap-2.5 rounded-lg px-2 py-1.5"
        >
          <div
            class="flex size-7 items-center justify-center overflow-hidden rounded-full bg-muted text-[10px] font-medium text-foreground"
          >
            <img v-if="person.imageUrl" :src="person.imageUrl" class="h-full w-full object-cover" />
            <span v-else>{{ initials(person) }}</span>
          </div>
          <NuxtLink
            :to="`/w/${workspaceStore.activeWorkspaceId}/members/${person.id}`"
            class="min-w-0 flex-1"
            @click="store.closeModal()"
          >
            <p class="truncate text-[13px] font-medium text-foreground hover:underline">
              {{ person.name || person.email }}
            </p>
            <p class="truncate text-[12px] text-muted-foreground">{{ person.email }}</p>
          </NuxtLink>
          <span
            v-if="person.isOwner"
            class="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-foreground"
          >
            Owner
          </span>
          <button
            v-else
            type="button"
            class="p-1 text-muted-foreground hover:text-red-600"
            :disabled="removingId === person.id"
            @click="removeMember(person)"
          >
            <XIcon class="size-3.5" />
          </button>
        </div>
        <p
          v-if="!workspaceStore.members.length"
          class="py-6 text-center text-[12px] text-muted-foreground"
        >
          No members yet.
        </p>
      </div>
    </DialogContent>
  </Dialog>
</template>
