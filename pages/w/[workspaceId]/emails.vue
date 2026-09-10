<script setup lang="ts">
import { whenDate } from "@/utils/date";
import { api } from "~/lib/api";
import type { EmailLogItem } from "@/types";
import { EMAIL_TEMPLATES, sampleEmailHtml } from "@/utils/email-templates";
import {
  emailStatusChip,
  emailTemplateChip,
  whenChip,
} from "@/utils/table-chips";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationEllipsis,
  PaginationFirst,
  PaginationLast,
  PaginationList,
  PaginationListItem,
  PaginationNext,
  PaginationPrev,
} from "@/components/ui/pagination";
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
</script>

<template>
  <div class="h-full min-w-0">
    <div
      class="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
    >
      <div>
        <h1 class="text-lg font-semibold tracking-tight text-foreground">
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
        <Button @click="openCompose('custom')"> Send email </Button>
        <Tabs :model-value="view" @update:model-value="onView">
          <TabsList>
            <TabsTrigger value="inbox">Inbox</TabsTrigger>
            <TabsTrigger value="sent">Sent</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </div>

    <div v-if="view === 'inbox' || view === 'sent'" class="space-y-4">
      <div
        class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end"
      >
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

      <div class="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow class="hover:bg-transparent border-border">
              <TableHead class="h-10">{{
                view === "inbox" ? "From" : "To"
              }}</TableHead>
              <TableHead class="h-10">Template</TableHead>
              <TableHead class="h-10">Subject</TableHead>
              <TableHead class="h-10">Project</TableHead>
              <TableHead class="h-10 w-[110px]">Status</TableHead>
              <TableHead class="h-10 w-[140px]">When</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableEmpty v-if="loading && !emails.length" :colspan="6">
              <span class="text-muted-foreground">Loading emails…</span>
            </TableEmpty>
            <TableEmpty v-else-if="!emails.length" :colspan="6">
              <span class="text-muted-foreground">
                {{
                  view === "inbox"
                    ? "Nothing here yet. Invites, notices, and emails teammates send you will show up here."
                    : "No emails match these filters. Messages you send will show up here."
                }}
              </span>
            </TableEmpty>
            <TableRow
              v-for="item in paged"
              :key="item.id"
              class="cursor-pointer"
              @click="openEmail(item)"
            >
              <TableCell
                class="max-w-[200px] truncate text-sm font-medium text-foreground"
              >
                {{
                  view === "inbox"
                    ? item.fromName || item.fromEmail
                    : item.toEmail
                }}
              </TableCell>
              <TableCell>
                <span :class="emailTemplateChip(item.template)">
                  {{ item.templateLabel }}
                </span>
              </TableCell>
              <TableCell class="max-w-[240px] truncate text-sm text-foreground">
                {{ item.subject }}
              </TableCell>
              <TableCell
                class="max-w-[160px] truncate text-sm text-muted-foreground"
              >
                {{ item.projectName || "Workspace" }}
              </TableCell>
              <TableCell>
                <span :class="emailStatusChip(item.status)">
                  {{ item.status }}
                </span>
              </TableCell>
              <TableCell
                class="whitespace-nowrap"
                :title="when(item.createdAt).title"
              >
                <span :class="whenChip(item.createdAt)">
                  {{ when(item.createdAt).label }}
                </span>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>

        <div
          v-if="emails.length"
          class="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <p class="text-sm text-muted-foreground">{{ rangeLabel }}</p>
          <Pagination
            v-if="emails.length > PAGE_SIZE"
            v-slot="{ page: currentPage }"
            :page="page"
            :total="emails.length"
            :items-per-page="PAGE_SIZE"
            :sibling-count="1"
            show-edges
            @update:page="page = $event"
          >
            <PaginationList v-slot="{ items }" class="flex items-center gap-1">
              <PaginationFirst />
              <PaginationPrev />
              <template v-for="(item, index) in items" :key="index">
                <PaginationListItem
                  v-if="item.type === 'page'"
                  :value="item.value"
                  as-child
                >
                  <Button
                    class="h-8 w-8 p-0"
                    :variant="
                      item.value === currentPage ? 'default' : 'outline'
                    "
                  >
                    {{ item.value }}
                  </Button>
                </PaginationListItem>
                <PaginationEllipsis v-else :index="index" />
              </template>
              <PaginationNext />
              <PaginationLast />
            </PaginationList>
          </Pagination>
        </div>
      </div>
    </div>

    <div v-else class="grid gap-3 sm:grid-cols-2">
      <div
        v-for="item in EMAIL_TEMPLATES"
        :key="item.id"
        class="rounded-xl border border-border bg-card p-4 text-left"
      >
        <p class="text-sm font-semibold text-foreground">{{ item.label }}</p>
        <p class="mt-1 text-sm leading-6 text-muted-foreground">
          {{ item.description }}
        </p>
        <div class="mt-3 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" @click="previewTemplate(item.id)">
            Preview
          </Button>
          <Button size="sm" @click="openCompose(starterFromTemplate(item.id))">
            Use template
          </Button>
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
