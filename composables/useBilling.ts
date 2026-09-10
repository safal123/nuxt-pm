import { toast } from "vue-sonner";
import { api } from "~/lib/api";
import type {
  BillingCheckoutResponse,
  BillingInterval,
  BillingOverview,
  BillingPlan,
} from "~/types";

export const useBilling = () => {
  const workspaceStore = useWorkspaceStore();
  const billing = ref<BillingOverview | null>(null);
  const loading = ref(false);
  const acting = ref(false);

  const fetchBilling = async () => {
    loading.value = true;
    try {
      const workspaceId = workspaceStore.activeWorkspaceId;
      const result = await api<{ billing: BillingOverview }>("/api/billing", {
        query: workspaceId ? { workspaceId } : {},
      });
      billing.value = result.billing;
      return result.billing;
    } finally {
      loading.value = false;
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
    fetchBilling,
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
