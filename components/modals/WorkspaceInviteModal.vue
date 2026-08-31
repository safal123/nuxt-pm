<script setup lang="ts">
import { CopyIcon, LinkIcon } from "lucide-vue-next";
import { toast } from "vue-sonner";

const store = useModalsStore();
const workspaceStore = useWorkspaceStore();

const open = computed(
  () => store.isOpen && store.modalName === "workspaceInvite",
);
const email = ref("");
const creating = ref(false);
const errorMessage = ref("");
const inviteUrl = ref("");
const copied = ref(false);

watch(open, (value) => {
  if (!value) return;
  email.value = "";
  errorMessage.value = "";
  inviteUrl.value = "";
  copied.value = false;
});

const createInviteLink = async () => {
  creating.value = true;
  errorMessage.value = "";
  copied.value = false;
  try {
    const invite = await workspaceStore.createInvite(email.value.trim() || undefined);
    if (!invite?.url) return;
    inviteUrl.value = invite.url;
    await navigator.clipboard.writeText(invite.url);
    copied.value = true;
    toast.success(
      invite.emailed
        ? `Invite emailed to ${invite.email} and the link was copied.`
        : "Invite link created and copied. It expires in 72 hours.",
    );
  } catch (error: any) {
    errorMessage.value =
      error?.data?.message || error?.message || "Could not create an invite link.";
  } finally {
    creating.value = false;
  }
};

const copyInvite = async () => {
  if (!inviteUrl.value) return;
  await navigator.clipboard.writeText(inviteUrl.value);
  copied.value = true;
  toast.success("Invite link copied.");
};
</script>

<template>
  <Dialog :open="open" @update:open="(value) => { if (!value) store.closeModal() }">
    <DialogContent class="max-w-md">
      <DialogHeader>
        <DialogTitle>Invite to workspace</DialogTitle>
      </DialogHeader>

      <p class="text-sm text-muted-foreground">
        Create a secure link. Anyone with it can join after signing in.
        Add an email to lock the invite to that person and send it with Resend.
      </p>

      <label class="mt-4 block text-sm font-medium text-foreground">
        Email
        <span class="font-normal text-muted-foreground">(optional)</span>
        <input
          v-model="email"
          type="email"
          placeholder="name@example.com"
          class="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
        />
      </label>

      <Button class="mt-4 w-full" :disabled="creating" @click="createInviteLink">
        <LinkIcon class="h-4 w-4 mr-1" />
        {{
          creating
            ? "Creating…"
            : email.trim()
              ? "Send invite email"
              : "Create invite link"
        }}
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
          {{ copied ? "Copied" : "Copy" }}
        </Button>
      </div>
    </DialogContent>
  </Dialog>
</template>
