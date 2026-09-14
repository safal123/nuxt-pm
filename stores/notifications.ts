import { defineStore } from "pinia";
import { api } from "~/lib/api";
import type { WorkspaceActivitiesResponse, WorkspaceActivity } from "~/types";
import {
  isActivityUnread,
  NOTIFICATION_SEEN_KEY,
} from "~/utils/activity";

const MAX_ITEMS = 20;

const readSeen = (workspaceId: string) => {
  if (!import.meta.client) return null;
  return localStorage.getItem(NOTIFICATION_SEEN_KEY(workspaceId));
};

const writeSeen = (workspaceId: string, value: string) => {
  if (!import.meta.client) return;
  localStorage.setItem(NOTIFICATION_SEEN_KEY(workspaceId), value);
};

export const useNotificationStore = defineStore("notifications", () => {
  const items = ref<WorkspaceActivity[]>([]);
  const loading = ref(false);
  const workspaceId = ref("");
  const lastSeenAt = ref<string | null>(null);

  const userStore = useUserStore();
  const userId = computed(() => userStore.user?.id ?? null);

  const unreadCount = computed(
    () =>
      items.value.filter((item) =>
        isActivityUnread(item, lastSeenAt.value, userId.value),
      ).length,
  );

  const hydrateSeen = (id: string, feed: WorkspaceActivity[]) => {
    const stored = readSeen(id);
    if (stored) {
      lastSeenAt.value = stored;
      return;
    }
    const seed =
      feed[0]?.createdAt != null
        ? new Date(feed[0].createdAt).toISOString()
        : new Date().toISOString();
    lastSeenAt.value = seed;
    writeSeen(id, seed);
  };

  const fetchFeed = async (id: string) => {
    if (!id) {
      items.value = [];
      workspaceId.value = "";
      return;
    }
    loading.value = true;
    try {
      const result = await api<WorkspaceActivitiesResponse>(
        `/api/workspaces/${id}/activities`,
        { query: { kind: "all", page: 1, limit: MAX_ITEMS } },
      );
      items.value = result.activities ?? [];
      workspaceId.value = id;
      hydrateSeen(id, items.value);
    } catch {
      items.value = [];
    } finally {
      loading.value = false;
    }
  };

  const applyActivity = (activity: WorkspaceActivity) => {
    if (!activity?.id) return;
    items.value = [
      activity,
      ...items.value.filter((item) => item.id !== activity.id),
    ].slice(0, MAX_ITEMS);
  };

  const markAllRead = () => {
    if (!workspaceId.value) return;
    const next = new Date().toISOString();
    lastSeenAt.value = next;
    writeSeen(workspaceId.value, next);
  };

  const isUnread = (activity: WorkspaceActivity) =>
    isActivityUnread(activity, lastSeenAt.value, userId.value);

  return {
    items,
    loading,
    workspaceId,
    lastSeenAt,
    unreadCount,
    fetchFeed,
    applyActivity,
    markAllRead,
    isUnread,
  };
});
