<script setup lang="ts">
import {
  AlertTriangleIcon,
  CalendarClockIcon,
  CheckIcon,
  CreditCardIcon,
  Loader2Icon,
  RefreshCwIcon,
  SparklesIcon,
} from "lucide-vue-next";
import type { BillingOverview } from "@/types";
import { formatDate, relativeDate } from "@/utils/date";
import { formatMoney, PLAN_PRICES, type PlanInterval } from "@/utils/plans";
import { billingEventChip, invoiceStatusChip } from "@/utils/table-chips";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "vue-sonner";

definePageMeta({
  layout: "dashboard",
  name: "workspace-billing",
  middleware: "workspace",
});

const { isOwner } = useWorkspaceLayout();
const {
  billing,
  loading,
  acting,
  loadingMoreEvents,
  fetchBilling,
  loadMoreEvents,
  startCheckout,
  openPortal,
} = useBilling();

if (isOwner.value) {
  try {
    await fetchBilling();
  } catch {
    // Page still renders the manage and empty states.
  }
}

const interval = ref<PlanInterval>(
  billing.value?.interval === "month" ? "month" : "year",
);

watch(
  () => billing.value?.interval,
  (value) => {
    if (value === "month" || value === "year") interval.value = value;
  },
);

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
const canManage = computed(() => billing.value?.canManage ?? false);
const isCanceling = computed(() => !!billing.value?.cancelAtPeriodEnd);
const isPaid = computed(
  () => billing.value?.plan === "team" || billing.value?.plan === "business",
);

const periodProgress = computed(() => {
  const days = billing.value?.daysRemaining ?? 0;
  const total = billing.value?.interval === "year" ? 365 : 30;
  return Math.min(100, Math.max(0, Math.round(((total - days) / total) * 100)));
});

const usageRows = computed(() => {
  const b = billing.value;
  if (!b) return [];
  return [
    {
      label: "Workspaces",
      used: b.usage.workspaces,
      limit: b.limits.workspaces,
    },
    {
      label: "Projects",
      used: b.usage.projects,
      limit: b.limits.projects,
    },
    {
      label: "Members",
      used: b.usage.members,
      limit: b.limits.members,
    },
  ];
});

const usagePercent = (used: number, limit: number | null) => {
  if (limit == null || limit <= 0) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
};

const usageLabel = (used: number, limit: number | null) =>
  limit == null ? `${used} · unlimited` : `${used} / ${limit}`;

const plans = computed(() => [
  {
    id: "team" as const,
    name: "Team",
    price: PLAN_PRICES.team[interval.value],
    features: [
      "Unlimited projects and members",
      "AI task summaries and project chat",
      "Full workspace activity",
      "Custom branded emails",
    ],
  },
  {
    id: "business" as const,
    name: "Business",
    price: PLAN_PRICES.business[interval.value],
    features: [
      "Everything in Team",
      "Unlimited workspaces",
      "Activity across every workspace",
      "Priority support",
    ],
  },
]);

const metricItems = computed(() => {
  const seats = billing.value?.seats ?? 0;
  const cadence =
    billing.value?.interval === "year"
      ? "yearly"
      : billing.value?.interval === "month"
        ? "monthly"
        : null;
  return [
    {
      id: "plan",
      label: "Current plan",
      value: planLabel.value,
      hint: `${seats} ${seats === 1 ? "seat" : "seats"}${cadence ? ` · ${cadence}` : ""}`,
      badge: isCanceling.value ? "Ending" : undefined,
    },
    {
      id: "paid",
      label: "Paid so far",
      value: formatMoney(billing.value?.totalPaid ?? 0, currency.value),
      hint: "Sum of paid Stripe invoices",
    },
    {
      id: "remaining",
      label: "Remaining this period",
      value: formatMoney(billing.value?.remainingValue ?? 0, currency.value),
      hint: billing.value?.amountDue
        ? `Unused value already paid · ${formatMoney(billing.value.amountDue, currency.value)} due next`
        : "Unused value already paid",
    },
    {
      id: "ends",
      label: "Plan ends",
      value: billing.value?.daysRemaining ?? 0,
      suffix: "days",
      hint: endsLabel.value,
    },
  ];
});

const eventLabel = (type: string) => type.replace(/_/g, " ");

const amountFor = (invoice: NonNullable<BillingOverview["upcoming"]>) => {
  const cents =
    invoice.status === "paid" ? invoice.amountPaid : invoice.amountDue;
  return formatMoney(cents, invoice.currency);
};

const refreshing = ref(false);
const onRefresh = async () => {
  if (refreshing.value || !canManage.value) return;
  refreshing.value = true;
  try {
    await fetchBilling();
    toast.success("Billing updated");
  } catch (error: any) {
    toast.error(error?.data?.message || "Could not refresh billing.");
  } finally {
    refreshing.value = false;
  }
};

const onCheckout = async (
  plan: "team" | "business",
  nextInterval: PlanInterval,
) => {
  if (!canManage.value) return;
  try {
    const result = await startCheckout(plan, nextInterval);
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

const onLoadMore = async () => {
  try {
    await loadMoreEvents();
  } catch (error: any) {
    toast.error(error?.data?.message || "Could not load more activity.");
  }
};
</script>

<template>
  <div class="h-full min-w-0 overflow-y-auto">
    <div class="flex w-full flex-col gap-4 pb-8">
      <PageHeader
        title="Billing"
        description="Manage the subscription, see what was paid, and the trail of plan changes."
      >
        <template v-if="canManage">
          <Button
            type="button"
            variant="outline"
            :disabled="loading || refreshing || acting"
            @click="onRefresh"
          >
            <RefreshCwIcon :class="refreshing || loading ? 'animate-spin' : ''" />
            Refresh
          </Button>
          <Button
            v-if="isPaid"
            type="button"
            variant="outline"
            :disabled="acting"
            @click="onPortal"
          >
            <CreditCardIcon />
            Billing portal
          </Button>
        </template>
      </PageHeader>

      <div
        v-if="isCanceling && canManage"
        class="flex flex-col gap-2.5 rounded-xl border border-amber-300/60 bg-amber-50 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between dark:border-amber-500/30 dark:bg-amber-500/10"
      >
        <div class="flex items-start gap-2.5">
          <div
            class="flex size-7 shrink-0 items-center justify-center rounded-md bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
          >
            <AlertTriangleIcon class="size-3.5" />
          </div>
          <div>
            <p class="text-[13px] font-medium text-foreground">
              Cancellation scheduled
            </p>
            <p class="mt-0.5 text-[12px] text-muted-foreground">
              You keep {{ planLabel }} until {{ endsLabel.toLowerCase() }}.
              After that the workspace drops back to Free.
            </p>
          </div>
        </div>
        <Button type="button" class="shrink-0" :disabled="acting" @click="onPortal">
          Keep subscription
        </Button>
      </div>

      <PageMetrics :items="metricItems">
        <template #ends>
          <div
            v-if="isPaid"
            class="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted"
          >
            <div
              class="h-full rounded-full transition-all"
              :class="isCanceling ? 'bg-amber-500' : 'bg-primary'"
              :style="{ width: `${periodProgress}%` }"
            />
          </div>
        </template>
      </PageMetrics>

      <PageSection
        title="Usage"
        :description="`How this workspace sits against ${planLabel} limits.`"
      >
        <div class="grid gap-2.5 sm:grid-cols-3">
          <div
            v-for="row in usageRows"
            :key="row.label"
            class="rounded-xl border border-border bg-card px-3 py-2.5"
          >
            <div class="flex items-center justify-between gap-2">
              <p class="text-[12px] text-muted-foreground">{{ row.label }}</p>
              <p class="text-[12px] font-medium tabular-nums text-foreground">
                {{ usageLabel(row.used, row.limit) }}
              </p>
            </div>
            <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                class="h-full rounded-full bg-primary transition-all"
                :style="{
                  width:
                    row.limit == null
                      ? '8%'
                      : `${usagePercent(row.used, row.limit)}%`,
                }"
              />
            </div>
          </div>
        </div>
      </PageSection>

      <PageSection
        title="Manage subscription"
        description="Team and Business are billed per member and include AI summaries."
      >
        <template #actions>
          <Tabs
            v-if="canManage"
            :model-value="interval"
            @update:model-value="
              (value) => {
                if (value === 'month' || value === 'year') interval = value;
              }
            "
          >
            <TabsList>
              <TabsTrigger value="month">Monthly</TabsTrigger>
              <TabsTrigger value="year">Yearly</TabsTrigger>
            </TabsList>
          </Tabs>
        </template>

        <div v-if="canManage" class="grid gap-2.5 sm:grid-cols-2">
          <article
            v-for="plan in plans"
            :key="plan.id"
            class="group relative overflow-hidden rounded-xl border bg-card p-3 transition hover:border-primary/40 hover:shadow-sm"
            :class="
              billing?.plan === plan.id
                ? 'border-primary/40 ring-1 ring-primary/20'
                : 'border-border'
            "
          >
            <div class="flex items-start justify-between gap-2.5">
              <div>
                <p class="text-[13px] font-medium text-foreground">{{ plan.name }}</p>
                <p class="mt-0.5 text-[15px] font-semibold tracking-tight">
                  ${{ plan.price }}
                  <span class="text-[12px] font-normal text-muted-foreground">
                    / member / month
                  </span>
                </p>
              </div>
              <span
                v-if="billing?.plan === plan.id"
                class="rounded-md bg-primary/10 px-1.5 py-px text-[10px] font-medium uppercase tracking-wide text-primary"
              >
                Current
              </span>
            </div>
            <ul class="mt-2.5 space-y-1.5">
              <li
                v-for="feature in plan.features"
                :key="feature"
                class="flex items-start gap-1.5 text-[12px] text-muted-foreground"
              >
                <CheckIcon class="mt-0.5 size-3.5 shrink-0 text-primary" />
                {{ feature }}
              </li>
            </ul>
            <Button
              class="mt-3 w-full"
              :variant="billing?.plan === plan.id ? 'outline' : 'default'"
              :disabled="acting || loading || billing?.plan === plan.id"
              @click="onCheckout(plan.id, interval)"
            >
              <SparklesIcon v-if="billing?.plan !== plan.id" />
              {{
                billing?.plan === plan.id
                  ? "Current plan"
                  : `Upgrade to ${plan.name}`
              }}
            </Button>
          </article>
        </div>
        <p
          v-else
          class="rounded-xl border border-border bg-card px-3 py-2.5 text-[12px] text-muted-foreground"
        >
          Only the workspace owner can change the plan.
        </p>
      </PageSection>

      <PageSection
        title="Invoices"
        description="What Stripe has billed, including the next charge."
      >
        <div class="overflow-hidden rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow class="hover:bg-transparent border-border">
                <TableHead>Invoice</TableHead>
                <TableHead>Period ends</TableHead>
                <TableHead>Status</TableHead>
                <TableHead class="text-right">Amount</TableHead>
                <TableHead class="w-[90px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableEmpty
                v-if="loading && !(billing?.invoices?.length)"
                :colspan="5"
              >
                <span class="text-muted-foreground">Loading invoices…</span>
              </TableEmpty>
              <TableEmpty v-else-if="!canManage" :colspan="5">
                <span class="text-muted-foreground">
                  Invoice history is only visible to the workspace owner.
                </span>
              </TableEmpty>
              <TableEmpty
                v-else-if="!billing?.upcoming && !billing?.invoices?.length"
                :colspan="5"
              >
                <span class="text-muted-foreground">
                  No invoices yet. Upgrade above to start billing.
                </span>
              </TableEmpty>
              <template v-else>
                <TableRow
                  v-if="billing?.upcoming"
                  class="transition-colors hover:bg-accent/40"
                >
                  <TableCell class="font-medium text-foreground">
                    {{ billing.upcoming.number || "Upcoming" }}
                  </TableCell>
                  <TableCell class="text-muted-foreground">
                    {{
                      billing.upcoming.periodEnd
                        ? formatDate(billing.upcoming.periodEnd)
                        : "—"
                    }}
                  </TableCell>
                  <TableCell>
                    <span :class="invoiceStatusChip('upcoming')">Upcoming</span>
                  </TableCell>
                  <TableCell class="text-right tabular-nums">
                    {{ amountFor(billing.upcoming) }}
                  </TableCell>
                  <TableCell />
                </TableRow>
                <TableRow
                  v-for="invoice in billing?.invoices ?? []"
                  :key="invoice.id"
                  class="transition-colors hover:bg-accent/40"
                >
                  <TableCell class="font-medium text-foreground">
                    {{ invoice.number || invoice.id }}
                  </TableCell>
                  <TableCell class="text-muted-foreground">
                    {{
                      invoice.periodEnd
                        ? formatDate(invoice.periodEnd)
                        : formatDate(invoice.createdAt)
                    }}
                  </TableCell>
                  <TableCell>
                    <span :class="invoiceStatusChip(invoice.status)">
                      {{ invoice.status }}
                    </span>
                  </TableCell>
                  <TableCell class="text-right tabular-nums">
                    {{ amountFor(invoice) }}
                  </TableCell>
                  <TableCell class="text-right">
                    <a
                      v-if="invoice.hostedInvoiceUrl || invoice.invoicePdf"
                      :href="
                        invoice.hostedInvoiceUrl || invoice.invoicePdf || '#'
                      "
                      target="_blank"
                      rel="noreferrer"
                      class="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      View
                    </a>
                  </TableCell>
                </TableRow>
              </template>
            </TableBody>
          </Table>
        </div>
      </PageSection>

      <PageSection
        title="Billing activity"
        description="Plan changes, payments, cancellations, and portal visits."
      >
        <template #actions>
          <p
            v-if="canManage && billing?.eventsTotal"
            class="text-[11px] text-muted-foreground"
          >
            Showing {{ billing.events.length }} of {{ billing.eventsTotal }}
          </p>
        </template>
        <div class="overflow-hidden rounded-xl border border-border bg-card">
          <div
            v-if="loading && !billing?.events?.length"
            class="px-3 py-8 text-center text-[12px] text-muted-foreground"
          >
            Loading activity…
          </div>
          <div
            v-else-if="!canManage"
            class="px-3 py-8 text-center text-[12px] text-muted-foreground"
          >
            Billing activity is only visible to the workspace owner.
          </div>
          <div
            v-else-if="!billing?.events?.length"
            class="flex flex-col items-center gap-2 px-3 py-8 text-center"
          >
            <CalendarClockIcon class="size-4 text-muted-foreground" />
            <p class="text-[12px] text-muted-foreground">
              Nothing yet. Upgrade or open the portal and events will land here.
            </p>
          </div>
          <ul v-else class="divide-y divide-border">
            <li
              v-for="event in billing.events"
              :key="event.id"
              class="flex flex-col gap-1.5 px-3 py-2.5 transition-colors hover:bg-accent/40 sm:flex-row sm:items-start sm:justify-between"
            >
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-1.5">
                  <span :class="billingEventChip(event.type)">
                    {{ eventLabel(event.type) }}
                  </span>
                  <p class="text-[13px] text-foreground">{{ event.message }}</p>
                </div>
                <p
                  class="mt-1 text-[11px] text-muted-foreground"
                  :title="formatDate(event.createdAt, 'd MMM yyyy h:mm a') || ''"
                >
                  {{ relativeDate(event.createdAt) }}
                </p>
              </div>
              <p
                v-if="event.amount != null"
                class="shrink-0 text-[13px] tabular-nums text-foreground"
              >
                {{ formatMoney(event.amount, event.currency || "usd") }}
              </p>
            </li>
          </ul>
          <div
            v-if="canManage && billing?.eventsHasMore"
            class="border-t border-border px-3 py-2"
          >
            <Button
              type="button"
              variant="outline"
              class="w-full"
              :disabled="loadingMoreEvents"
              @click="onLoadMore"
            >
              <Loader2Icon v-if="loadingMoreEvents" class="animate-spin" />
              {{ loadingMoreEvents ? "Loading…" : "Load more" }}
            </Button>
          </div>
        </div>
      </PageSection>
    </div>
  </div>
</template>
