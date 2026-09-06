<script setup lang="ts">
import { format, formatDistanceToNow, parseISO } from "date-fns";
import type { EmailLogItem } from "@/types";
import { emailTemplateLabel } from "@/utils/email-templates";

const props = defineProps<{
  email: EmailLogItem | null;
}>();

const emit = defineEmits<{
  (e: "close"): void;
}>();

const open = computed(() => !!props.email);

const close = () => emit("close");

const onOpen = (value: boolean) => {
  if (!value) close();
};

const parseDate = (value: Date | string) => {
  const date = typeof value === "string" ? parseISO(value) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const isSample = computed(() => props.email?.status === "sample");

const when = computed(() => {
  if (isSample.value) return { relative: "Template preview", exact: "—" };
  const date = props.email ? parseDate(props.email.createdAt) : null;
  if (!date) return { relative: "", exact: "—" };
  return {
    relative: formatDistanceToNow(date, { addSuffix: true }),
    exact: format(date, "EEEE, MMM d, yyyy 'at' h:mm a"),
  };
});
</script>

<template>
  <Dialog :open="open" @update:open="onOpen">
    <DialogContent class="max-w-2xl gap-0 p-0 sm:max-w-3xl">
      <DialogHeader class="border-b border-border px-6 py-4">
        <DialogTitle>{{ email?.subject || "Email" }}</DialogTitle>
        <DialogDescription>
          {{ email ? emailTemplateLabel(email.template) : "" }}
          <span v-if="when.relative"> · {{ when.relative }}</span>
        </DialogDescription>
      </DialogHeader>

      <div v-if="email" class="max-h-[75vh] space-y-4 overflow-y-auto px-6 py-5">
        <dl v-if="!isSample" class="overflow-hidden rounded-lg border border-border">
          <div class="grid grid-cols-[100px_1fr] gap-3 border-b border-border px-3 py-2.5">
            <dt class="text-xs font-medium text-muted-foreground">To</dt>
            <dd class="truncate text-sm text-foreground">{{ email.toEmail }}</dd>
          </div>
          <div class="grid grid-cols-[100px_1fr] gap-3 border-b border-border px-3 py-2.5">
            <dt class="text-xs font-medium text-muted-foreground">From</dt>
            <dd class="truncate text-sm text-foreground">
              {{ email.fromName ? `${email.fromName} · ${email.fromEmail}` : email.fromEmail || "—" }}
            </dd>
          </div>
          <div class="grid grid-cols-[100px_1fr] gap-3 border-b border-border px-3 py-2.5">
            <dt class="text-xs font-medium text-muted-foreground">Template</dt>
            <dd class="text-sm text-foreground">{{ email.templateLabel }}</dd>
          </div>
          <div class="grid grid-cols-[100px_1fr] gap-3 border-b border-border px-3 py-2.5">
            <dt class="text-xs font-medium text-muted-foreground">Project</dt>
            <dd class="text-sm text-foreground">{{ email.projectName || "Workspace" }}</dd>
          </div>
          <div class="grid grid-cols-[100px_1fr] gap-3 border-b border-border px-3 py-2.5">
            <dt class="text-xs font-medium text-muted-foreground">Status</dt>
            <dd class="text-sm capitalize text-foreground">{{ email.status }}</dd>
          </div>
          <div class="grid grid-cols-[100px_1fr] gap-3 px-3 py-2.5">
            <dt class="text-xs font-medium text-muted-foreground">When</dt>
            <dd class="text-sm text-foreground">{{ when.exact }}</dd>
          </div>
        </dl>

        <p v-if="email.error" class="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {{ email.error }}
        </p>

        <div class="space-y-2">
          <p class="text-xs font-medium text-muted-foreground">Template preview</p>
          <iframe
            class="h-[420px] w-full rounded-lg border border-border bg-white"
            sandbox=""
            :srcdoc="email.html"
            title="Email template preview"
          />
        </div>
      </div>

      <DialogFooter class="border-t border-border px-6 py-4">
        <Button variant="outline" @click="close">Close</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
