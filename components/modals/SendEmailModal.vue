<script setup lang="ts">
import { SendIcon } from "lucide-vue-next";
import { toast } from "vue-sonner";
import { toTypedSchema } from "@vee-validate/zod";
import * as z from "zod";
import { customEmailHtml, customEmailStarters } from "@/utils/email-templates";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const NONE = "none";

const STARTERS = [
  { id: "custom", label: "Blank custom" },
  { id: "welcome", label: "Welcome" },
  { id: "project", label: "Project update" },
  { id: "notice", label: "Notice" },
] as const;

type StarterId = (typeof STARTERS)[number]["id"];

const props = defineProps<{
  open: boolean;
  starter?: StarterId;
  projects: { id: string; name: string }[];
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "sent"): void;
}>();

const workspaceStore = useWorkspaceStore();
const userStore = useUserStore();
const sending = ref(false);
const formKey = ref(0);
const starterId = ref<StarterId>("custom");

const dashboardUrl = computed(() => {
  const workspaceId = workspaceStore.activeWorkspaceId;
  const path = workspaceId ? `/w/${workspaceId}/dashboard` : "/w";
  return import.meta.client ? `${window.location.origin}${path}` : path;
});

const starters = computed(() =>
  customEmailStarters({
    workspaceName: workspaceStore.activeWorkspace?.name || "this workspace",
    projectName: props.projects.find((project) => project.id === selectedProjectId.value)?.name,
    senderName: userStore.user?.name || userStore.user?.email || "A teammate",
    dashboardUrl: dashboardUrl.value,
  }),
);

const selectedProjectId = ref(NONE);

const initialValues = () => {
  const starter = starters.value[starterId.value];
  return {
    to: "",
    subject: starter.title || "",
    kicker: starter.kicker,
    title: starter.title,
    body: starter.body,
    actionLabel: starter.actionLabel,
    actionUrl: starter.actionUrl,
    projectId: NONE,
  };
};

watch(
  () => props.open,
  (value) => {
    if (!value) return;
    sending.value = false;
    starterId.value = props.starter || "custom";
    selectedProjectId.value = NONE;
    formKey.value += 1;
  },
);

const formSchema = toTypedSchema(
  z
    .object({
      to: z.string().trim().email("Enter a valid email"),
      subject: z.string().trim().min(1, "Subject is required"),
      kicker: z.string().optional(),
      title: z.string().trim().min(1, "Title is required"),
      body: z.string().trim().min(1, "Message is required"),
      actionLabel: z.string().optional(),
      actionUrl: z.string().optional(),
      projectId: z.string().optional(),
    })
    .refine(
      (value) =>
        (!value.actionLabel?.trim() && !value.actionUrl?.trim()) ||
        (Boolean(value.actionLabel?.trim()) && Boolean(value.actionUrl?.trim())),
      { message: "Add both a button label and URL, or leave both empty.", path: ["actionUrl"] },
    )
    .refine(
      (value) =>
        !value.actionUrl?.trim() || /^https?:\/\//i.test(value.actionUrl.trim()),
      { message: "URL must start with http:// or https://", path: ["actionUrl"] },
    ),
);

const close = () => {
  if (sending.value) return;
  emit("close");
};

const ignoreSelectOutside = (event: Event) => {
  const target = event.target as HTMLElement | null;
  if (target?.closest("[data-radix-select-viewport], [data-radix-popper-content-wrapper]")) {
    event.preventDefault();
  }
};

const applyStarter = (id: StarterId, setValues: (values: Record<string, string>) => void, current: Record<string, unknown>) => {
  starterId.value = id;
  const starter = starters.value[id];
  setValues({
    to: typeof current.to === "string" ? current.to : "",
    subject: starter.title || (typeof current.subject === "string" ? current.subject : ""),
    kicker: starter.kicker,
    title: starter.title,
    body: starter.body,
    actionLabel: starter.actionLabel,
    actionUrl: starter.actionUrl,
    projectId: typeof current.projectId === "string" ? current.projectId : NONE,
  });
};

const previewHtml = (values: Record<string, unknown>) =>
  customEmailHtml({
    kicker: String(values.kicker || "Update"),
    title: String(values.title || "Title"),
    body: String(values.body || "Write your message…"),
    actionLabel: String(values.actionLabel || ""),
    actionUrl: String(values.actionUrl || ""),
  });

async function onSubmit(values: any) {
  const workspaceId = workspaceStore.activeWorkspaceId;
  if (!workspaceId || sending.value) return;
  sending.value = true;
  try {
    await $fetch(`/api/workspaces/${workspaceId}/emails`, {
      method: "POST",
      body: {
        to: values.to.trim(),
        subject: values.subject.trim(),
        kicker: values.kicker?.trim() || "Update",
        title: values.title.trim(),
        body: values.body.trim(),
        actionLabel: values.actionLabel?.trim() || undefined,
        actionUrl: values.actionUrl?.trim() || undefined,
        projectId: values.projectId === NONE ? null : values.projectId,
      },
    });
    toast.success("Email sent", {
      description: `Sent to ${values.to.trim()}.`,
    });
    emit("sent");
    emit("close");
  } catch (error: any) {
    toast.error("Could not send email", {
      description: error?.data?.message || "Please try again.",
    });
  } finally {
    sending.value = false;
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="(value) => { if (!value) close() }">
    <DialogContent
      class="flex max-h-[90vh] max-w-4xl flex-col gap-0 overflow-hidden p-0"
      @pointer-down-outside="ignoreSelectOutside"
      @focus-outside="ignoreSelectOutside"
      @interact-outside="ignoreSelectOutside"
    >
      <DialogHeader class="border-b border-border px-6 py-4">
        <DialogTitle>Send email</DialogTitle>
        <DialogDescription>
          Write a branded message, preview the template, then send it.
        </DialogDescription>
      </DialogHeader>

      <Form
        :key="formKey"
        v-slot="{ handleSubmit, values, setValues }"
        class="flex min-h-0 flex-1 flex-col overflow-hidden"
        as=""
        :validation-schema="formSchema"
        :initial-values="initialValues()"
      >
        <form
          id="sendEmailForm"
          class="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-2"
          @submit="handleSubmit($event, onSubmit)"
        >
          <div class="min-h-0 space-y-3 overflow-y-auto border-b border-border p-6 lg:border-b-0 lg:border-r">
            <div class="grid gap-3 sm:grid-cols-2">
              <div class="space-y-1.5">
                <p class="text-sm font-medium">Template</p>
                <Select
                  :model-value="starterId"
                  :modal="false"
                  @update:model-value="(value) => {
                    if (typeof value === 'string') applyStarter(value as StarterId, setValues, values)
                  }"
                >
                  <SelectTrigger class="h-9">
                    <SelectValue placeholder="Choose a template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem v-for="item in STARTERS" :key="item.id" :value="item.id">
                        {{ item.label }}
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <FormField v-slot="{ componentField }" name="projectId">
                <FormItem>
                  <FormLabel>Project</FormLabel>
                  <FormControl>
                    <Select
                      :model-value="componentField.modelValue"
                      :modal="false"
                      @update:model-value="(value) => {
                        componentField.onChange(value)
                        if (typeof value === 'string') selectedProjectId = value
                      }"
                    >
                      <SelectTrigger class="h-9">
                        <SelectValue placeholder="Workspace" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem :value="NONE">Workspace</SelectItem>
                          <SelectItem
                            v-for="project in projects"
                            :key="project.id"
                            :value="project.id"
                          >
                            {{ project.name }}
                          </SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </FormControl>
                </FormItem>
              </FormField>
            </div>

            <FormField v-slot="{ componentField }" name="to">
              <FormItem>
                <FormLabel>To</FormLabel>
                <FormControl>
                  <Input
                    v-bind="componentField"
                    type="email"
                    placeholder="name@example.com"
                    :disabled="sending"
                    autocomplete="off"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>

            <div v-if="workspaceStore.members.length" class="space-y-1.5">
              <p class="text-xs text-muted-foreground">Or pick a workspace member</p>
              <Select
                :modal="false"
                @update:model-value="(value) => {
                  if (typeof value === 'string') setValues({ ...values, to: value })
                }"
              >
                <SelectTrigger class="h-9">
                  <SelectValue placeholder="Insert member email" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem
                      v-for="member in workspaceStore.members"
                      :key="member.id"
                      :value="member.email"
                    >
                      {{ member.name || member.email }}
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <FormField v-slot="{ componentField }" name="subject">
              <FormItem>
                <FormLabel>Subject</FormLabel>
                <FormControl>
                  <Input
                    v-bind="componentField"
                    placeholder="Subject line"
                    :disabled="sending"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>

            <FormField v-slot="{ componentField }" name="kicker">
              <FormItem>
                <FormLabel>Eyebrow</FormLabel>
                <FormControl>
                  <Input
                    v-bind="componentField"
                    placeholder="Update"
                    :disabled="sending"
                  />
                </FormControl>
              </FormItem>
            </FormField>

            <FormField v-slot="{ componentField }" name="title">
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input
                    v-bind="componentField"
                    placeholder="Headline"
                    :disabled="sending"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>

            <FormField v-slot="{ componentField }" name="body">
              <FormItem>
                <FormLabel>Message</FormLabel>
                <FormControl>
                  <Textarea
                    v-bind="componentField"
                    class="min-h-28"
                    placeholder="Write the email body"
                    :disabled="sending"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>

            <div class="grid gap-3 sm:grid-cols-2">
              <FormField v-slot="{ componentField }" name="actionLabel">
                <FormItem>
                  <FormLabel>Button label</FormLabel>
                  <FormControl>
                    <Input
                      v-bind="componentField"
                      placeholder="Optional"
                      :disabled="sending"
                    />
                  </FormControl>
                </FormItem>
              </FormField>
              <FormField v-slot="{ componentField }" name="actionUrl">
                <FormItem>
                  <FormLabel>Button URL</FormLabel>
                  <FormControl>
                    <Input
                      v-bind="componentField"
                      placeholder="https://"
                      :disabled="sending"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              </FormField>
            </div>
          </div>

          <div class="min-h-0 overflow-y-auto bg-muted/30 p-6">
            <p class="mb-2 text-xs font-medium text-muted-foreground">Template preview</p>
            <iframe
              class="h-[420px] w-full rounded-lg border border-border bg-white"
              sandbox=""
              :srcdoc="previewHtml(values)"
              title="Custom email preview"
            />
          </div>
        </form>
      </Form>

      <DialogFooter class="border-t border-border px-6 py-4">
        <Button type="button" variant="outline" :disabled="sending" @click="close">
          Cancel
        </Button>
        <Button type="submit" form="sendEmailForm" :disabled="sending">
          <SendIcon class="h-4 w-4" />
          {{ sending ? "Sending…" : "Send email" }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
