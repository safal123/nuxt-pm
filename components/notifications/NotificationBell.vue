<script setup lang="ts">
import { BellIcon } from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import { personInitials } from "@/utils/activity";
import { whenDate } from "@/utils/date";
import {
  workspaceChannel,
  type WorkspaceRealtimeEvent,
} from "~/utils/realtime";
import type { WorkspaceActivity } from "~/types";

const workspaceStore = useWorkspaceStore();
const notifications = useNotificationStore();
const open = ref(false);

const workspaceId = computed(
  () => workspaceStore.activeWorkspaceId || "",
);

const when = whenDate;

useRealtimeChannel(
  () => workspaceChannel(workspaceId.value),
  (payload) => {
    const event = payload as WorkspaceRealtimeEvent & { clientId?: string | null };
    if (event.type === "activity.created" && event.activity) {
      notifications.applyActivity(event.activity as WorkspaceActivity);
      return;
    }
    if (event.type === "email.sent" && workspaceId.value) {
      void notifications.fetchFeed(workspaceId.value);
    }
  },
  () => ({ workspaceId: workspaceId.value || undefined }),
);

watch(
  workspaceId,
  (id) => {
    if (!import.meta.client || !id) return;
    void notifications.fetchFeed(id);
  },
  { immediate: true },
);

const onOpen = (next: boolean) => {
  open.value = next;
  if (next) notifications.markAllRead();
};

const activityHref = (activity: WorkspaceActivity) => {
  const ws = workspaceId.value;
  if (!ws) return undefined;
  if (activity.email) return `/w/${ws}/emails`;
  if (activity.project?.id) return `/w/${ws}/projects/${activity.project.id}`;
  return `/w/${ws}/activities`;
};

const subject = (activity: WorkspaceActivity) =>
  activity.email?.subject ||
  activity.task?.title ||
  activity.project?.name ||
  "Workspace";
</script>

<template>
  <Popover :open="open" @update:open="onOpen">
    <PopoverTrigger as-child>
      <Button
        type="button"
        variant="outline"
        size="icon"
        class="relative shrink-0"
        aria-label="Notifications"
      >
        <BellIcon class="h-4 w-4" />
        <span
          v-if="notifications.unreadCount"
          class="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground"
        >
          {{ notifications.unreadCount > 9 ? "9+" : notifications.unreadCount }}
        </span>
      </Button>
    </PopoverTrigger>
    <PopoverContent
      align="end"
      :side-offset="8"
      class="w-[min(22rem,calc(100vw-1.5rem))] p-0"
    >
      <div class="flex items-center justify-between border-b border-border px-3 py-2.5">
        <p class="text-sm font-semibold text-foreground">Activity</p>
        <Button
          v-if="workspaceId"
          variant="ghost"
          size="sm"
          class="h-7 px-2 text-xs"
          as-child
        >
          <NuxtLink :to="`/w/${workspaceId}/activities`" @click="open = false">
            View all
          </NuxtLink>
        </Button>
      </div>

      <div class="max-h-[min(22rem,70vh)] overflow-y-auto">
        <p
          v-if="notifications.loading && !notifications.items.length"
          class="px-3 py-8 text-center text-sm text-muted-foreground"
        >
          Loading activity…
        </p>
        <p
          v-else-if="!notifications.items.length"
          class="px-3 py-8 text-center text-sm text-muted-foreground"
        >
          No activity yet in this workspace.
        </p>
        <ul v-else class="divide-y divide-border">
          <li v-for="item in notifications.items" :key="item.id">
            <NuxtLink
              :to="activityHref(item)"
              class="flex gap-3 px-3 py-2.5 transition-colors hover:bg-accent"
              @click="open = false"
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
                  {{ subject(item) }}
                  ·
                  <span :title="when(item.createdAt).title">{{
                    when(item.createdAt).label
                  }}</span>
                </p>
              </div>
            </NuxtLink>
          </li>
        </ul>
      </div>
    </PopoverContent>
  </Popover>
</template>
