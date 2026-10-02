import { toast } from "vue-sonner";
import { api } from "~/lib/api";
import type {
  BillingCheckoutResponse,
  BillingEventItem,
  BillingInterval,
  BillingOverview,
  BillingPlan,
} from "~/types";
import { BILLING_EVENTS_PAGE_SIZE } from "~/utils/billing";

export const useBilling = () => {
  const workspaceStore = useWorkspaceStore();
  const billing = ref<BillingOverview | null>(null);
  const loading = ref(false);
  const acting = ref(false);
  const loadingMoreEvents = ref(false);
  const eventsPage = ref(1);

  const fetchBilling = async () => {
    loading.value = true;
    try {
      const workspaceId = workspaceStore.activeWorkspaceId;
      const result = await api<{ billing: BillingOverview }>("/api/billing", {
        query: workspaceId ? { workspaceId } : {},
      });
      billing.value = result.billing;
      eventsPage.value = 1;
      return result.billing;
    } finally {
      loading.value = false;
    }
  };

  const loadMoreEvents = async () => {
    if (!billing.value?.eventsHasMore || loadingMoreEvents.value) return;
    loadingMoreEvents.value = true;
    try {
      const workspaceId = workspaceStore.activeWorkspaceId;
      const nextPage = eventsPage.value + 1;
      const result = await api<{
        events: BillingEventItem[];
        total: number;
        page: number;
        hasMore: boolean;
      }>("/api/billing/events", {
        query: {
          ...(workspaceId ? { workspaceId } : {}),
          page: nextPage,
          limit: BILLING_EVENTS_PAGE_SIZE,
        },
      });
      if (!billing.value) return;
      billing.value = {
        ...billing.value,
        events: [...billing.value.events, ...(result.events ?? [])],
        eventsTotal: result.total,
        eventsHasMore: result.hasMore,
      };
      eventsPage.value = nextPage;
    } finally {
      loadingMoreEvents.value = false;
    }
  };

  const startCheckout = async (
    plan: Exclude<BillingPlan, "free">,
    interval: BillingInterval,
  ) => {
    acting.value = true;
    try {
      const result = await api<BillingCheckoutResponse>("/api/billing/checkout", {
        method: "POST",
        body: { plan, interval },
      });
      if (result.url) {
        window.location.href = result.url;
        return result;
      }
      await fetchBilling();
      return result;
    } finally {
      acting.value = false;
    }
  };

  const openPortal = async () => {
    acting.value = true;
    try {
      const { url } = await api<{ url: string }>("/api/billing/portal", {
        method: "POST",
      });
      window.location.href = url;
    } finally {
      acting.value = false;
    }
  };

  return {
    billing,
    loading,
    acting,
    loadingMoreEvents,
    fetchBilling,
    loadMoreEvents,
    startCheckout,
    openPortal,
  };
};

export const useBillingReturn = () => {
  const route = useRoute();
  const router = useRouter();

  const consume = async () => {
    const status = route.query.billing;
    if (status !== "success" && status !== "cancel") return;

    const sessionId =
      typeof route.query.session_id === "string" ? route.query.session_id : "";

    if (status === "success" && sessionId) {
      try {
        await api("/api/billing/sync", {
          method: "POST",
          body: { sessionId },
        });
        toast.success("Your subscription is active.");
      } catch {
        toast.success("Payment received. Your plan will update in a moment.");
      }
    }

    const query = { ...route.query };
    delete query.billing;
    delete query.session_id;
    await router.replace({ path: route.path, query });
  };

  return { consume };
};
