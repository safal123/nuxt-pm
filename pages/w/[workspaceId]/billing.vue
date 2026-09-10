<script setup lang="ts">
import { toast } from "vue-sonner";
import { formatDate } from "@/utils/date";
import { formatMoney, type PlanInterval } from "@/utils/plans";

definePageMeta({
  layout: "dashboard",
  name: "workspace-billing",
  middleware: "workspace",
});

const { billing, loading, acting, fetchBilling, startCheckout, openPortal } =
  useBilling();

try {
  await fetchBilling();
} catch {
  // Page still renders the manage and empty states.
}

const planLabel = computed(() => {
  const plan = billing.value?.plan || "free";
  return plan.charAt(0).toUpperCase() + plan.slice(1);
});

const endsLabel = computed(() => {
  const end = billing.value?.currentPeriodEnd;
  if (!end) return "No end date";
  const formatted = formatDate(end);
  if (billing.value?.cancelAtPeriodEnd) return `Cancels ${formatted}`;
  return `Renews ${formatted}`;
});

const currency = computed(() => billing.value?.currency || "usd");

const onCheckout = async (
  plan: "team" | "business",
  interval: PlanInterval,
) => {
  if (!billing.value?.canManage) return;
  try {
    const result = await startCheckout(plan, interval);
    if (result.alreadyActive) {
      toast.message(`You are already on ${plan}.`);
    } else if (result.updated) {
      toast.success(`Updated to ${plan}.`);
      await fetchBilling();
    }
  } catch (error: any) {
    toast.error(error?.data?.message || "Could not start checkout.");
  }
};

const onPortal = async () => {
  try {
    await openPortal();
  } catch (error: any) {
    toast.error(
      error?.data?.message ||
        "Could not open the billing portal. Finish a checkout first.",
    );
  }
};
</script>

<template>
  <div class="h-full min-w-0 overflow-y-auto">
    <div class="flex w-full flex-col gap-8 pb-10">
      <div>
        <h1 class="text-lg font-semibold tracking-tight text-foreground">
          Billing
        </h1>
        <p class="mt-1 text-sm text-muted-foreground">
          Manage the subscription, see what was paid, and the trail of plan
          changes.
        </p>
      </div>

      <div
        class="grid overflow-hidden rounded-xl border border-border bg-card sm:grid-cols-2 xl:grid-cols-4"
      >
        <div class="px-5 py-4 sm:border-r sm:border-border">
          <p class="text-sm text-muted-foreground">Current plan</p>
          <p class="mt-3 text-2xl font-semibold tracking-tight text-foreground">
            {{ planLabel }}
          </p>
          <p class="mt-1 text-xs text-muted-foreground">
            {{ billing?.seats ?? 0 }}
            {{ billing?.seats === 1 ? "seat" : "seats" }}
            <span v-if="billing?.interval">
              · {{ billing.interval === "year" ? "yearly" : "monthly" }}
            </span>
          </p>
        </div>
        <div class="border-t border-border px-5 py-4 sm:border-t-0 xl:border-r">
          <p class="text-sm text-muted-foreground">Paid so far</p>
          <p class="mt-3 text-2xl font-semibold tabular-nums text-foreground">
            {{ formatMoney(billing?.totalPaid ?? 0, currency) }}
          </p>
          <p class="mt-1 text-xs text-muted-foreground">
            Sum of paid Stripe invoices
          </p>
        </div>
        <div class="border-t border-border px-5 py-4 sm:border-r xl:border-t-0">
          <p class="text-sm text-muted-foreground">Remaining this period</p>
          <p class="mt-3 text-2xl font-semibold tabular-nums text-foreground">
            {{ formatMoney(billing?.remainingValue ?? 0, currency) }}
          </p>
          <p class="mt-1 text-xs text-muted-foreground">
            Unused value already paid
            <span v-if="billing?.amountDue">
              · {{ formatMoney(billing.amountDue, currency) }} due next
            </span>
          </p>
        </div>
        <div class="border-t border-border px-5 py-4 xl:border-t-0">
          <p class="text-sm text-muted-foreground">Plan ends</p>
          <p class="mt-3 text-2xl font-semibold tabular-nums text-foreground">
            {{ billing?.daysRemaining ?? 0 }}
            <span class="text-base font-medium text-muted-foreground">days</span>
          </p>
          <p class="mt-1 text-xs text-muted-foreground">{{ endsLabel }}</p>
        </div>
      </div>

      <BillingSettings
        :billing="billing"
        :loading="loading"
        :acting="acting"
        :can-manage="billing?.canManage ?? false"
        @checkout="onCheckout"
        @portal="onPortal"
      />

      <BillingInvoices
        :invoices="billing?.invoices ?? []"
        :upcoming="billing?.upcoming ?? null"
        :loading="loading"
        :can-manage="billing?.canManage ?? false"
      />

      <BillingActivity
        :events="billing?.events ?? []"
        :loading="loading"
        :can-manage="billing?.canManage ?? false"
      />
    </div>
  </div>
</template>
