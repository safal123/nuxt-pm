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
    <div class="flex w-full flex-col gap-8 pb-10">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 class="text-lg font-semibold tracking-tight text-foreground">
            Billing
          </h1>
          <p class="mt-1 text-sm text-muted-foreground">
            Manage the subscription, see what was paid, and the trail of plan
            changes.
          </p>
        </div>
        <div v-if="canManage" class="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            class="h-8"
            :disabled="loading || refreshing || acting"
            @click="onRefresh"
          >
            <RefreshCwIcon
              class="h-3.5 w-3.5"
              :class="refreshing || loading ? 'animate-spin' : ''"
            />
            Refresh
          </Button>
          <Button
            v-if="isPaid"
            type="button"
            variant="outline"
            size="sm"
            class="h-8"
            :disabled="acting"
            @click="onPortal"
          >
            <CreditCardIcon class="h-3.5 w-3.5" />
            Billing portal
          </Button>
        </div>
      </div>

      <div
        v-if="isCanceling && canManage"
        class="flex flex-col gap-3 rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-amber-500/30 dark:bg-amber-500/10"
      >
        <div class="flex items-start gap-3">
          <div
            class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
          >
            <AlertTriangleIcon class="h-4 w-4" />
          </div>
          <div>
            <p class="text-sm font-medium text-foreground">
              Cancellation scheduled
            </p>
            <p class="mt-0.5 text-sm text-muted-foreground">
              You keep {{ planLabel }} until {{ endsLabel.toLowerCase() }}.
              After that the workspace drops back to Free.
            </p>
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          class="h-8 shrink-0"
          :disabled="acting"
          @click="onPortal"
        >
          Keep subscription
        </Button>
      </div>

      <div
        class="grid overflow-hidden rounded-xl border border-border bg-card sm:grid-cols-2 xl:grid-cols-4"
      >
        <div class="px-5 py-4 sm:border-r sm:border-border">
          <p class="text-sm text-muted-foreground">Current plan</p>
          <div class="mt-3 flex items-center gap-2">
            <p class="text-2xl font-semibold tracking-tight text-foreground">
              {{ planLabel }}
            </p>
            <span
              v-if="isCanceling"
              class="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
            >
              Ending
            </span>
          </div>
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
          <div
            v-if="isPaid"
            class="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"
          >
            <div
              class="h-full rounded-full transition-all"
              :class="isCanceling ? 'bg-amber-500' : 'bg-primary'"
              :style="{ width: `${periodProgress}%` }"
            />
          </div>
        </div>
      </div>

      <!-- Usage -->
      <section class="space-y-3">
        <div>
          <h2 class="text-base font-semibold text-foreground">Usage</h2>
          <p class="mt-0.5 text-sm text-muted-foreground">
            How this workspace sits against {{ planLabel }} limits.
          </p>
        </div>
        <div class="grid gap-3 sm:grid-cols-3">
          <div
            v-for="row in usageRows"
            :key="row.label"
            class="rounded-xl border border-border bg-card p-4"
          >
            <div class="flex items-center justify-between gap-2">
              <p class="text-sm text-muted-foreground">{{ row.label }}</p>
              <p class="text-sm font-medium tabular-nums text-foreground">
                {{ usageLabel(row.used, row.limit) }}
              </p>
            </div>
            <div class="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
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
      </section>

      <!-- Plans -->
      <section class="space-y-3">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 class="text-base font-semibold text-foreground">
              Manage subscription
            </h2>
            <p class="mt-0.5 text-sm text-muted-foreground">
              Team and Business are billed per member and include AI summaries.
            </p>
          </div>
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
        </div>

        <div v-if="canManage" class="grid gap-3 sm:grid-cols-2">
          <article
            v-for="plan in plans"
            :key="plan.id"
            class="group relative overflow-hidden rounded-xl border bg-card p-5 transition hover:border-primary/40 hover:shadow-sm"
            :class="
              billing?.plan === plan.id
                ? 'border-primary/40 ring-1 ring-primary/20'
                : 'border-border'
            "
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-sm font-medium text-foreground">{{ plan.name }}</p>
                <p class="mt-1 text-2xl font-semibold tracking-tight">
                  ${{ plan.price }}
                  <span class="text-sm font-normal text-muted-foreground">
                    / member / month
                  </span>
                </p>
              </div>
              <span
                v-if="billing?.plan === plan.id"
                class="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary"
              >
                Current
              </span>
            </div>
            <ul class="mt-4 space-y-2">
              <li
                v-for="feature in plan.features"
                :key="feature"
                class="flex items-start gap-2 text-sm text-muted-foreground"
              >
                <CheckIcon class="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                {{ feature }}
              </li>
            </ul>
            <Button
              class="mt-5 w-full"
              size="sm"
              :variant="billing?.plan === plan.id ? 'outline' : 'default'"
              :disabled="acting || loading || billing?.plan === plan.id"
              @click="onCheckout(plan.id, interval)"
            >
              <SparklesIcon
                v-if="billing?.plan !== plan.id"
                class="h-3.5 w-3.5"
              />
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
          class="rounded-xl border border-border bg-card px-4 py-4 text-sm text-muted-foreground"
        >
          Only the workspace owner can change the plan.
        </p>
      </section>

      <!-- Invoices -->
      <section class="space-y-3">
        <div>
          <h2 class="text-base font-semibold text-foreground">Invoices</h2>
          <p class="mt-0.5 text-sm text-muted-foreground">
            What Stripe has billed, including the next charge.
          </p>
        </div>
        <div class="overflow-hidden rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow class="hover:bg-transparent border-border">
                <TableHead class="h-10">Invoice</TableHead>
                <TableHead class="h-10">Period ends</TableHead>
                <TableHead class="h-10">Status</TableHead>
                <TableHead class="h-10 text-right">Amount</TableHead>
                <TableHead class="h-10 w-[90px]" />
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
                  <TableCell class="text-sm font-medium text-foreground">
                    {{ billing.upcoming.number || "Upcoming" }}
                  </TableCell>
                  <TableCell class="text-sm text-muted-foreground">
                    {{
                      billing.upcoming.periodEnd
                        ? formatDate(billing.upcoming.periodEnd)
                        : "—"
                    }}
                  </TableCell>
                  <TableCell>
                    <span :class="invoiceStatusChip('upcoming')">Upcoming</span>
                  </TableCell>
                  <TableCell class="text-right text-sm tabular-nums">
                    {{ amountFor(billing.upcoming) }}
                  </TableCell>
                  <TableCell />
                </TableRow>
                <TableRow
                  v-for="invoice in billing?.invoices ?? []"
                  :key="invoice.id"
                  class="transition-colors hover:bg-accent/40"
                >
                  <TableCell class="text-sm font-medium text-foreground">
                    {{ invoice.number || invoice.id }}
                  </TableCell>
                  <TableCell class="text-sm text-muted-foreground">
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
                  <TableCell class="text-right text-sm tabular-nums">
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
      </section>

      <!-- Activity -->
      <section class="space-y-3">
        <div class="flex items-end justify-between gap-3">
          <div>
            <h2 class="text-base font-semibold text-foreground">
              Billing activity
            </h2>
            <p class="mt-0.5 text-sm text-muted-foreground">
              Plan changes, payments, cancellations, and portal visits.
            </p>
          </div>
          <p
            v-if="canManage && billing?.eventsTotal"
            class="text-xs text-muted-foreground"
          >
            Showing {{ billing.events.length }} of {{ billing.eventsTotal }}
          </p>
        </div>
        <div class="overflow-hidden rounded-xl border border-border bg-card">
          <div
            v-if="loading && !billing?.events?.length"
            class="px-4 py-8 text-center text-sm text-muted-foreground"
          >
            Loading activity…
          </div>
          <div
            v-else-if="!canManage"
            class="px-4 py-8 text-center text-sm text-muted-foreground"
          >
            Billing activity is only visible to the workspace owner.
          </div>
          <div
            v-else-if="!billing?.events?.length"
            class="flex flex-col items-center gap-2 px-4 py-10 text-center"
          >
            <CalendarClockIcon class="h-5 w-5 text-muted-foreground" />
            <p class="text-sm text-muted-foreground">
              Nothing yet. Upgrade or open the portal and events will land here.
            </p>
          </div>
          <ul v-else class="divide-y divide-border">
            <li
              v-for="event in billing.events"
              :key="event.id"
              class="flex flex-col gap-2 px-4 py-3 transition-colors hover:bg-accent/40 sm:flex-row sm:items-start sm:justify-between"
            >
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <span :class="billingEventChip(event.type)">
                    {{ eventLabel(event.type) }}
                  </span>
                  <p class="text-sm text-foreground">{{ event.message }}</p>
                </div>
                <p
                  class="mt-1 text-xs text-muted-foreground"
                  :title="formatDate(event.createdAt, 'd MMM yyyy h:mm a') || ''"
                >
                  {{ relativeDate(event.createdAt) }}
                </p>
              </div>
              <p
                v-if="event.amount != null"
                class="shrink-0 text-sm tabular-nums text-foreground"
              >
                {{ formatMoney(event.amount, event.currency || "usd") }}
              </p>
            </li>
          </ul>
          <div
            v-if="canManage && billing?.eventsHasMore"
            class="border-t border-border px-4 py-3"
          >
            <Button
              type="button"
              variant="outline"
              size="sm"
              class="w-full"
              :disabled="loadingMoreEvents"
              @click="onLoadMore"
            >
              <Loader2Icon
                v-if="loadingMoreEvents"
                class="h-3.5 w-3.5 animate-spin"
              />
              {{ loadingMoreEvents ? "Loading…" : "Load more" }}
            </Button>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
