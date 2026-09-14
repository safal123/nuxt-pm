<script setup lang="ts">
import {
  CheckCircle2Icon,
  FolderIcon,
  HistoryIcon,
  LayoutGridIcon,
  ListTodoIcon,
} from "lucide-vue-next";
import { api } from "~/lib/api";
import type { MemberProfile, WorkspaceActivity } from "@/types";
import { personInitials } from "@/utils/activity";
import { formatDate, relativeDate } from "@/utils/date";
import { statusChip, statusLabel } from "@/utils/task-status";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

definePageMeta({
  layout: "dashboard",
  name: "workspace-member",
  middleware: "workspace",
});

const route = useRoute();
const userStore = useUserStore();
const workspaceId = computed(() => String(route.params.workspaceId || ""));
const userId = computed(() => String(route.params.userId || ""));

const profile = ref<MemberProfile | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const selected = ref<WorkspaceActivity | null>(null);

const load = async () => {
  if (!workspaceId.value || !userId.value) {
    loading.value = false;
    return;
  }
  loading.value = true;
  error.value = null;
  try {
    profile.value = await api<MemberProfile>(
      `/api/workspaces/${workspaceId.value}/members/${userId.value}`,
    );
  } catch (err: any) {
    profile.value = null;
    error.value =
      err?.data?.message || err?.message || "Could not load this profile.";
  } finally {
    loading.value = false;
  }
};

await load();

watch([workspaceId, userId], () => {
  void load();
});

const member = computed(() => profile.value?.member);
const isYou = computed(() => member.value?.id === userStore.user?.id);

const statItems = computed(() => [
  {
    label: "Projects",
    value: profile.value?.stats.projects ?? 0,
    icon: FolderIcon,
  },
  {
    label: "Assigned",
    value: profile.value?.stats.assigned ?? 0,
    icon: ListTodoIcon,
  },
  {
    label: "Open",
    value: profile.value?.stats.open ?? 0,
    icon: HistoryIcon,
  },
  {
    label: "Done",
    value: profile.value?.stats.done ?? 0,
    icon: CheckCircle2Icon,
  },
]);

const roleLabel = computed(() =>
  member.value?.isOwner
    ? "Owner"
    : member.value?.role?.toLowerCase() || "Member",
);
</script>

<template>
  <div class="h-full min-w-0 overflow-y-auto">
    <div v-if="error" class="flex flex-col items-center py-16 text-center">
      <p class="text-sm font-medium text-foreground">Profile unavailable</p>
      <p class="mt-1 text-sm text-muted-foreground">{{ error }}</p>
      <Button
        class="mt-4"
        variant="outline"
        size="sm"
        as-child
      >
        <NuxtLink :to="{ name: 'workspace-members', params: { workspaceId } }">
          Back to people
        </NuxtLink>
      </Button>
    </div>

    <template v-else>
      <div class="mb-5 flex items-start justify-between gap-3">
        <div class="flex min-w-0 items-start gap-3">
          <Skeleton v-if="loading && !member" class="h-14 w-14 rounded-full" />
          <div
            v-else
            class="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-violet-100 text-base font-semibold text-violet-700 dark:bg-violet-500/20 dark:text-violet-300"
          >
            <img
              v-if="member?.imageUrl"
              :src="member.imageUrl"
              alt=""
              class="h-full w-full object-cover"
            />
            <span v-else>{{ personInitials(member || { name: null, email: "" }) }}</span>
          </div>
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <h1 class="text-xl font-semibold tracking-tight text-foreground">
                {{ member?.name || member?.email || "Member" }}
              </h1>
              <span
                v-if="isYou"
                class="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground"
              >
                You
              </span>
              <span
                class="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium capitalize text-muted-foreground"
              >
                {{ roleLabel }}
              </span>
            </div>
            <p class="mt-1 truncate text-sm text-muted-foreground">
              {{ member?.email }}
            </p>
            <p
              v-if="member?.joinedAt"
              class="mt-1 text-xs text-muted-foreground"
            >
              Joined {{ formatDate(member.joinedAt) || relativeDate(member.joinedAt) }}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          as-child
        >
          <NuxtLink
            :to="{ name: 'workspace-members', params: { workspaceId } }"
          >
            All people
          </NuxtLink>
        </Button>
      </div>

      <PageStats :items="statItems" :loading="loading && !profile" />

      <div class="mt-5 grid gap-5 lg:grid-cols-5">
        <div class="space-y-5 lg:col-span-2">
          <section class="overflow-hidden rounded-xl border border-border bg-card">
            <div class="border-b border-border px-4 py-3">
              <h2 class="text-sm font-semibold text-foreground">Projects</h2>
            </div>
            <div v-if="loading && !profile" class="space-y-2 p-4">
              <Skeleton class="h-4 w-40" />
              <Skeleton class="h-4 w-32" />
            </div>
            <p
              v-else-if="!profile?.projects.length"
              class="px-4 py-8 text-center text-sm text-muted-foreground"
            >
              Not on any live projects.
            </p>
            <div v-else class="divide-y divide-border">
              <NuxtLink
                v-for="project in profile.projects"
                :key="project.id"
                :to="{
                  name: 'workspace-project',
                  params: { workspaceId, projectId: project.id },
                }"
                class="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-accent/50"
              >
                <LayoutGridIcon class="h-3.5 w-3.5 text-muted-foreground" />
                <span class="min-w-0 truncate font-medium text-foreground">
                  {{ project.name }}
                </span>
              </NuxtLink>
            </div>
          </section>

          <section class="overflow-hidden rounded-xl border border-border bg-card">
            <div class="border-b border-border px-4 py-3">
              <h2 class="text-sm font-semibold text-foreground">Assigned cards</h2>
            </div>
            <div v-if="loading && !profile" class="space-y-2 p-4">
              <Skeleton class="h-4 w-48" />
              <Skeleton class="h-4 w-36" />
            </div>
            <p
              v-else-if="!profile?.tasks.length"
              class="px-4 py-8 text-center text-sm text-muted-foreground"
            >
              No cards assigned right now.
            </p>
            <div v-else class="divide-y divide-border">
              <NuxtLink
                v-for="task in profile.tasks"
                :key="task.id"
                :to="{
                  name: 'workspace-project',
                  params: { workspaceId, projectId: task.projectId },
                }"
                class="block px-4 py-2.5 hover:bg-accent/50"
              >
                <p class="truncate text-sm font-medium text-foreground">
                  {{ task.title }}
                </p>
                <div class="mt-1 flex flex-wrap items-center gap-2">
                  <span
                    class="inline-flex rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset"
                    :class="statusChip(task.status)"
                  >
                    {{ statusLabel(task.status) }}
                  </span>
                  <span class="truncate text-xs text-muted-foreground">
                    {{ task.projectName }}
                  </span>
                </div>
              </NuxtLink>
            </div>
          </section>
        </div>

        <section class="overflow-hidden rounded-xl border border-border bg-card lg:col-span-3">
          <div class="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 class="text-sm font-semibold text-foreground">Recent activity</h2>
          </div>
          <div class="px-4 py-4">
            <ActivityTimeline
              :activities="profile?.activities ?? []"
              :loading="loading && !profile"
              compact
              @select="selected = $event"
            />
          </div>
        </section>
      </div>
    </template>

    <ActivityDetailModal :activity="selected" @close="selected = null" />
  </div>
</template>
