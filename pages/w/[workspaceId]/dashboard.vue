<script setup lang="ts">
import { ArrowRightIcon, PlusIcon } from "lucide-vue-next";
import type { Project, WorkspaceActivity } from "@/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { personInitials } from "@/utils/activity";
import { relativeDate, whenDate } from "@/utils/date";

definePageMeta({
  layout: "dashboard",
  name: "workspace-dashboard",
  middleware: "workspace",
});

const route = useRoute();
const workspaceStore = useWorkspaceStore();
const modalsStore = useModalsStore();
const workspaceId = computed(() => String(route.params.workspaceId || ""));

const { stats, analytics, activity, pending } = useWorkspaceSummary(workspaceId);
const selectedActivity = ref<WorkspaceActivity | null>(null);

const workspace = computed(() => workspaceStore.activeWorkspace);
const liveProjectCount = computed(
  () =>
    (workspace.value?.projects ?? []).filter(
      (project: Project) => !project.archivedAt,
    ).length,
);

const recentActivity = computed(() => activity.value.slice(0, 8));

const openCreateProject = () =>
  modalsStore.openModal("createProject", {
    workspaceId: workspaceId.value,
  });

const openActivity = (item: (typeof activity.value)[number]) => {
  selectedActivity.value = {
    ...item,
    metadata: null,
    email: null,
  } as WorkspaceActivity;
};
</script>

<template>
  <div class="h-full min-w-0 overflow-y-auto">
    <div class="flex w-full flex-col gap-6 pb-10">
      <div class="flex min-w-0 items-start justify-between gap-3">
        <div class="min-w-0">
          <h1
            class="truncate text-xl font-semibold tracking-tight text-foreground"
          >
            {{ workspace?.name || "Workspace" }}
          </h1>
          <p class="mt-1 text-sm text-muted-foreground">
            {{ workspaceStore.members.length }}
            {{ workspaceStore.members.length === 1 ? "member" : "members" }}
            · {{ liveProjectCount }}
            {{ liveProjectCount === 1 ? "project" : "projects" }}
          </p>
        </div>
        <Button size="sm" class="shrink-0" @click="openCreateProject">
          <PlusIcon class="h-4 w-4" />
          New project
        </Button>
      </div>

      <div
        class="grid overflow-hidden rounded-xl border border-border bg-card sm:grid-cols-2 xl:grid-cols-4"
      >
        <template v-if="pending">
          <div
            v-for="index in 4"
            :key="index"
            class="border-border px-4 py-3.5"
            :class="{
              'border-t sm:border-t-0': index > 1,
              'sm:border-r': index === 1 || index === 3,
              'xl:border-r': index < 4,
              'xl:border-t-0': index > 2,
            }"
          >
            <Skeleton class="h-3.5 w-16" />
            <Skeleton class="mt-2.5 h-7 w-12" />
          </div>
        </template>
        <template v-else>
          <div class="px-4 py-3.5 sm:border-r sm:border-border">
            <p class="text-xs text-muted-foreground">Projects</p>
            <p class="mt-1.5 text-2xl font-semibold tabular-nums text-foreground">
              {{ stats.liveProjects }}
            </p>
          </div>
          <div
            class="border-t border-border px-4 py-3.5 sm:border-t-0 xl:border-r"
          >
            <p class="text-xs text-muted-foreground">Open</p>
            <p class="mt-1.5 text-2xl font-semibold tabular-nums text-foreground">
              {{ stats.openTasks }}
            </p>
          </div>
          <div
            class="border-t border-border px-4 py-3.5 sm:border-r xl:border-t-0"
          >
            <p class="text-xs text-muted-foreground">Done</p>
            <p class="mt-1.5 text-2xl font-semibold tabular-nums text-foreground">
              {{ stats.doneTasks }}
            </p>
          </div>
          <div class="border-t border-border px-4 py-3.5 xl:border-t-0">
            <p class="text-xs text-muted-foreground">Members</p>
            <p class="mt-1.5 text-2xl font-semibold tabular-nums text-foreground">
              {{ workspaceStore.members.length }}
            </p>
          </div>
        </template>
      </div>

      <WorkspaceAnalytics :analytics="analytics" :pending="pending" />

      <section class="min-w-0">
        <div class="mb-3 flex items-center justify-between gap-3">
          <h2 class="text-sm font-semibold text-foreground">Recent activity</h2>
          <Button variant="ghost" size="sm" class="h-8 px-2" as-child>
            <NuxtLink
              :to="{ name: 'workspace-activities', params: { workspaceId } }"
              class="gap-1 text-xs"
            >
              View all
              <ArrowRightIcon class="h-3.5 w-3.5" />
            </NuxtLink>
          </Button>
        </div>

        <div class="overflow-hidden rounded-xl border border-border bg-card">
          <p
            v-if="pending && !recentActivity.length"
            class="px-4 py-10 text-center text-sm text-muted-foreground"
          >
            Loading activity…
          </p>
          <p
            v-else-if="!recentActivity.length"
            class="px-4 py-10 text-center text-sm text-muted-foreground"
          >
            Board changes will show up here.
          </p>
          <button
            v-for="item in recentActivity"
            :key="item.id"
            type="button"
            class="flex w-full items-start gap-3 border-b border-border px-4 py-3 text-left last:border-b-0 hover:bg-accent/40"
            @click="openActivity(item)"
          >
            <div
              class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-[11px] font-semibold text-muted-foreground"
            >
              <img
                v-if="item.user.imageUrl"
                :src="item.user.imageUrl"
                alt=""
                class="h-full w-full object-cover"
              />
              <span v-else>{{ personInitials(item.user) }}</span>
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-sm leading-5 text-foreground">
                <span class="font-medium">{{
                  item.user.name || item.user.email
                }}</span>
                {{ " " }}
                <span class="text-muted-foreground">{{ item.message }}</span>
              </p>
              <p class="mt-0.5 truncate text-xs text-muted-foreground">
                {{ item.task?.title || item.project?.name || "Workspace" }}
                ·
                <span :title="whenDate(item.createdAt).title">{{
                  relativeDate(item.createdAt)
                }}</span>
              </p>
            </div>
          </button>
        </div>
      </section>
    </div>

    <ActivityDetailModal
      :activity="selectedActivity"
      @close="selectedActivity = null"
    />
  </div>
</template>
