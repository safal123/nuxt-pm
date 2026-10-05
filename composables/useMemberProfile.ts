import type { MemberProfile, WorkspaceActivity } from "~/types";
import { api } from "~/lib/api";

/** Member profile page data, with the activity list paged in on demand. */
export const useMemberProfile = (
  workspaceId: Ref<string>,
  userId: Ref<string>,
) => {
  const profile = ref<MemberProfile | null>(null);
  const loading = ref(true);
  const loadingMore = ref(false);
  const error = ref<string | null>(null);

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

  const hasMoreActivities = computed(() => Boolean(profile.value?.activitiesCursor));

  const loadMoreActivities = async () => {
    const current = profile.value;
    if (!current?.activitiesCursor || loadingMore.value) return;
    loadingMore.value = true;
    try {
      const page = await api<{
        activities: WorkspaceActivity[];
        nextCursor: string | null;
      }>(`/api/workspaces/${workspaceId.value}/members/${userId.value}/activities`, {
        query: { cursor: current.activitiesCursor },
      });
      if (profile.value !== current) return;
      current.activities = [...current.activities, ...page.activities];
      current.activitiesCursor = page.nextCursor;
    } finally {
      loadingMore.value = false;
    }
  };

  return {
    profile,
    loading,
    loadingMore,
    error,
    hasMoreActivities,
    load,
    loadMoreActivities,
  };
};
