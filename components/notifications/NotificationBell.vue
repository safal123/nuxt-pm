<script setup lang="ts">
import { useMediaQuery } from "@vueuse/core";
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
const isMobile = useMediaQuery("(max-width: 639px)");

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
        variant="ghost"
        size="icon"
        class="relative h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
        aria-label="Notifications"
      >
        <BellIcon />
        <span
          v-if="notifications.unreadCount"
          class="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-medium leading-none text-primary-foreground"
        >
          {{ notifications.unreadCount > 9 ? "9+" : notifications.unreadCount }}
        </span>
      </Button>
    </PopoverTrigger>
    <PopoverContent
      :align="isMobile ? 'center' : 'end'"
      :side-offset="8"
      :collision-padding="8"
      class="overflow-hidden rounded-xl border-border p-0 shadow-[0_12px_40px_rgba(15,23,42,0.12)]"
      :class="isMobile ? 'w-[calc(100vw-1rem)] max-w-none' : 'w-[22rem]'"
    >
      <div class="flex items-center justify-between border-b border-border px-3 py-2">
        <p class="text-[13px] font-semibold tracking-tight text-foreground">Activity</p>
        <Button
          v-if="workspaceId"
          variant="ghost"
          size="xs"
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
          class="px-3 py-8 text-center text-[12px] text-muted-foreground"
        >
          Loading activity…
        </p>
        <p
          v-else-if="!notifications.items.length"
          class="px-3 py-8 text-center text-[12px] text-muted-foreground"
        >
          No activity yet in this workspace.
        </p>
        <ul v-else class="space-y-0.5 p-1">
          <li v-for="item in notifications.items" :key="item.id">
            <NuxtLink
              :to="activityHref(item)"
              class="flex gap-2.5 rounded-lg border border-transparent px-2.5 py-2 transition-colors hover:border-border hover:bg-muted"
              @click="open = false"
            >
              <div
                class="mt-0.5 flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-[10px] font-medium text-foreground"
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
                <p class="text-[13px] leading-5 text-foreground">
                  <span class="font-medium">{{
                    item.user.name || item.user.email
                  }}</span>
                  {{ " " }}
                  <span class="text-muted-foreground">{{ item.message }}</span>
                </p>
                <p class="mt-0.5 truncate text-[11px] text-muted-foreground">
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
