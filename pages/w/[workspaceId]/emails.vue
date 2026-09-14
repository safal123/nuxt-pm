<script setup lang="ts">
import {
  InboxIcon,
  MailIcon,
  MailXIcon,
  SendIcon,
} from "lucide-vue-next";
import { startOfDay } from "date-fns";
import { groupActivitiesByDate, personInitials } from "@/utils/activity";
import { whenDate } from "@/utils/date";
import { api } from "~/lib/api";
import type { EmailLogItem } from "@/types";
import { workspaceChannel } from "~/utils/realtime";
import { EMAIL_TEMPLATES, sampleEmailHtml } from "@/utils/email-templates";
import { emailStatusChip, emailTemplateChip } from "@/utils/table-chips";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

definePageMeta({
  layout: "dashboard",
  name: "workspace-emails",
  middleware: "workspace",
});

const PAGE_SIZE = 12;
const ALL = "all";

const workspaceStore = useWorkspaceStore();
const loading = ref(true);
const view = ref<"inbox" | "sent" | "templates">("inbox");
const emails = ref<EmailLogItem[]>([]);
const projects = ref<{ id: string; name: string }[]>([]);
const projectId = ref(ALL);
const templateId = ref(ALL);
const page = ref(1);
const selected = ref<EmailLogItem | null>(null);
const composeOpen = ref(false);
const composeStarter = ref<"custom" | "welcome" | "project" | "notice">(
  "custom",
);
const box = computed(() => (view.value === "inbox" ? "inbox" : "sent"));

const fetchEmails = async () => {
  const workspaceId = workspaceStore.activeWorkspaceId;
  if (!workspaceId) {
    loading.value = false;
    return;
  }
  loading.value = true;
  try {
    const result = await api<{
      emails: EmailLogItem[];
      projects: { id: string; name: string }[];
    }>(`/api/workspaces/${workspaceId}/emails`, {
      query: {
        box: box.value,
        projectId: projectId.value,
        template: templateId.value,
      },
    });
    emails.value = result.emails ?? [];
    projects.value = result.projects ?? [];
  } catch (error) {
    console.error(error);
    emails.value = [];
  } finally {
    loading.value = false;
  }
};

await fetchEmails();

useRealtimeChannel(
  () => workspaceChannel(workspaceStore.activeWorkspaceId || ""),
  (payload) => {
    const event = payload as { type?: string };
    if (event.type === "email.sent") void fetchEmails();
  },
  () => ({
    workspaceId: workspaceStore.activeWorkspaceId || undefined,
  }),
);

watch(
  () => workspaceStore.activeWorkspaceId,
  () => {
    projectId.value = ALL;
    templateId.value = ALL;
  },
);

watch(
  [projectId, templateId, box, () => workspaceStore.activeWorkspaceId],
  () => {
    page.value = 1;
    fetchEmails();
  },
);

const paged = computed(() => {
  const start = (page.value - 1) * PAGE_SIZE;
  return emails.value.slice(start, start + PAGE_SIZE);
});

const groups = computed(() =>
  groupActivitiesByDate(
    paged.value.map((item) => ({ ...item, createdAt: item.createdAt })),
  ),
);

watch(emails, (list) => {
  const lastPage = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  if (page.value > lastPage) page.value = lastPage;
});

const rangeLabel = computed(() => {
  if (!emails.value.length) return "0 emails";
  const start = (page.value - 1) * PAGE_SIZE + 1;
  const end = Math.min(page.value * PAGE_SIZE, emails.value.length);
  return `${start}–${end} of ${emails.value.length}`;
});

const statItems = computed(() => {
  const today = startOfDay(new Date()).getTime();
  return [
    {
      label: view.value === "inbox" ? "Received" : "Sent",
      value: emails.value.length,
      icon: MailIcon,
    },
    {
      label: "Delivered",
      value: emails.value.filter((item) => item.status === "sent").length,
      icon: SendIcon,
    },
    {
      label: "Failed",
      value: emails.value.filter((item) => item.status === "failed").length,
      icon: MailXIcon,
    },
    {
      label: "Today",
      value: emails.value.filter(
        (item) => new Date(item.createdAt).getTime() >= today,
      ).length,
      icon: InboxIcon,
    },
  ];
});

const when = whenDate;

const onProject = (value: unknown) => {
  if (typeof value !== "string") return;
  projectId.value = value;
};

const onTemplate = (value: unknown) => {
  if (typeof value !== "string") return;
  templateId.value = value;
};

const openEmail = (item: EmailLogItem) => {
  selected.value = item;
};

const onView = (value: unknown) => {
  if (value === "inbox" || value === "sent" || value === "templates") {
    view.value = value;
  }
};

const previewTemplate = (id: (typeof EMAIL_TEMPLATES)[number]["id"]) => {
  const meta = EMAIL_TEMPLATES.find((item) => item.id === id);
  selected.value = {
    id: `sample-${id}`,
    template: id,
    templateLabel: meta?.label ?? id,
    subject: meta?.label ?? "Template preview",
    toEmail: "preview@example.com",
    fromEmail: "Northstar",
    html: sampleEmailHtml(id),
    text: null,
    status: "sample",
    error: null,
    projectId: null,
    projectName: null,
    createdAt: new Date().toISOString(),
  };
};

const starterFromTemplate = (
  id: (typeof EMAIL_TEMPLATES)[number]["id"],
): "custom" | "welcome" | "project" | "notice" => {
  if (id === "invite-accepted") return "welcome";
  if (id === "project-member") return "project";
  if (id === "invite-accepted-notice") return "notice";
  return "custom";
};

const openCompose = (
  starter: "custom" | "welcome" | "project" | "notice" = "custom",
) => {
  composeStarter.value = starter;
  composeOpen.value = true;
};

const counterpart = (item: EmailLogItem) =>
  view.value === "inbox" ? item.fromName || item.fromEmail : item.toEmail;
</script>

<template>
  <div class="h-full min-w-0 overflow-y-auto">
    <div
      class="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
    >
      <div>
        <h1 class="text-xl font-semibold tracking-tight text-foreground">
          Emails
        </h1>
        <p class="mt-1 text-sm text-muted-foreground">
          {{
            view === "inbox"
              ? "Workspace emails sent to you, without opening your mail app."
              : view === "sent"
                ? "Emails you sent, with a preview of the template that went out."
                : "Templates you can send to teammates from this workspace."
          }}
        </p>
      </div>
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Button @click="openCompose('custom')">Send email</Button>
        <Tabs :model-value="view" @update:model-value="onView">
          <TabsList>
            <TabsTrigger value="inbox">Inbox</TabsTrigger>
            <TabsTrigger value="sent">Sent</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </div>

    <template v-if="view === 'inbox' || view === 'sent'">
      <PageStats :items="statItems" :loading="loading && !emails.length" />

      <div class="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
        <Select :model-value="projectId" @update:model-value="onProject">
          <SelectTrigger class="h-9 w-full sm:w-[200px]">
            <SelectValue placeholder="All projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem :value="ALL">All projects</SelectItem>
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
        <Select :model-value="templateId" @update:model-value="onTemplate">
          <SelectTrigger class="h-9 w-full sm:w-[220px]">
            <SelectValue placeholder="All templates" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem :value="ALL">All templates</SelectItem>
              <SelectItem
                v-for="item in EMAIL_TEMPLATES"
                :key="item.id"
                :value="item.id"
              >
                {{ item.label }}
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div class="mt-4 overflow-hidden rounded-xl border border-border bg-card">
        <div v-if="loading && !emails.length" class="divide-y divide-border">
          <div
            v-for="index in 5"
            :key="index"
            class="flex items-start gap-3 px-4 py-3.5"
          >
            <Skeleton class="h-9 w-9 shrink-0 rounded-full" />
            <div class="min-w-0 flex-1 space-y-2">
              <Skeleton class="h-4 w-2/3" />
              <Skeleton class="h-3 w-1/3" />
            </div>
          </div>
        </div>

        <div
          v-else-if="!emails.length"
          class="flex flex-col items-center px-4 py-16 text-center"
        >
          <div
            class="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground"
          >
            <MailIcon class="h-5 w-5" />
          </div>
          <p class="mt-3 text-sm font-medium text-foreground">No emails yet</p>
          <p class="mt-1 max-w-sm text-sm text-muted-foreground">
            {{
              view === "inbox"
                ? "Invites, notices, and messages teammates send you will show up here."
                : "Messages you send from this workspace will show up here."
            }}
          </p>
        </div>

        <div v-else>
          <section
            v-for="group in groups"
            :key="group.key"
            class="border-b border-border last:border-b-0"
          >
            <p
              class="sticky top-0 z-10 border-b border-border bg-muted/50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              {{ group.label }}
            </p>
            <button
              v-for="item in group.items"
              :key="item.id"
              type="button"
              class="flex w-full items-start gap-3 px-4 py-3.5 text-left hover:bg-accent/50"
              @click="openEmail(item)"
            >
              <div
                class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-violet-100 text-[11px] font-semibold text-violet-700 dark:bg-violet-500/20 dark:text-violet-300"
              >
                {{ personInitials({ name: counterpart(item), email: item.toEmail }) }}
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex items-start justify-between gap-3">
                  <p class="min-w-0 text-sm font-medium text-foreground">
                    {{ counterpart(item) }}
                  </p>
                  <span
                    class="shrink-0 pt-0.5 text-xs tabular-nums text-muted-foreground"
                    :title="when(item.createdAt).title"
                  >
                    {{ when(item.createdAt).label }}
                  </span>
                </div>
                <p class="mt-0.5 truncate text-sm text-foreground">
                  {{ item.subject }}
                </p>
                <div class="mt-1.5 flex flex-wrap items-center gap-2">
                  <span :class="emailTemplateChip(item.template)">
                    {{ item.templateLabel }}
                  </span>
                  <span :class="emailStatusChip(item.status)">
                    {{ item.status }}
                  </span>
                  <span class="text-xs text-muted-foreground">
                    {{ item.projectName || "Workspace" }}
                  </span>
                </div>
              </div>
            </button>
          </section>
        </div>

        <TablePagination
          :page="page"
          :total="emails.length"
          :page-size="PAGE_SIZE"
          :range-label="rangeLabel"
          @update:page="page = $event"
        />
      </div>
    </template>

    <div v-else class="grid gap-3 sm:grid-cols-2">
      <div
        v-for="item in EMAIL_TEMPLATES"
        :key="item.id"
        class="rounded-xl border border-border bg-card p-4"
      >
        <div class="flex items-start gap-3">
          <div
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"
          >
            <MailIcon class="h-4 w-4" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <p class="text-sm font-semibold text-foreground">{{ item.label }}</p>
              <span :class="emailTemplateChip(item.id)">{{ item.id }}</span>
            </div>
            <p class="mt-1 text-sm leading-6 text-muted-foreground">
              {{ item.description }}
            </p>
            <div class="mt-3 flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                @click="previewTemplate(item.id)"
              >
                Preview
              </Button>
              <Button size="sm" @click="openCompose(starterFromTemplate(item.id))">
                Use template
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <EmailDetailModal :email="selected" @close="selected = null" />
    <SendEmailModal
      :open="composeOpen"
      :starter="composeStarter"
      :projects="projects"
      @close="composeOpen = false"
      @sent="fetchEmails"
    />
  </div>
</template>
