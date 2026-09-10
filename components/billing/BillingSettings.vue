<script setup lang="ts">
import type { BillingOverview } from "@/types";
import { PLAN_PRICES, type PlanInterval } from "@/utils/plans";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const props = defineProps<{
  billing: BillingOverview | null;
  loading: boolean;
  acting: boolean;
  canManage: boolean;
}>();

const emit = defineEmits<{
  checkout: [plan: "team" | "business", interval: PlanInterval];
  portal: [];
}>();

const interval = ref<PlanInterval>(
  props.billing?.interval === "month" ? "month" : "year",
);

const limitLabel = (used: number, limit: number | null) =>
  limit == null ? `${used} · unlimited` : `${used} / ${limit}`;
</script>

<template>
  <section class="space-y-3">
    <div class="flex items-center justify-between gap-3">
      <div>
        <h2 class="text-base font-semibold text-foreground">Manage subscription</h2>
        <p class="mt-0.5 text-sm text-muted-foreground">
          Change plan, seats billing interval, or open the Stripe portal.
        </p>
      </div>
      <Button
        v-if="canManage && billing && billing.plan !== 'free'"
        type="button"
        variant="outline"
        size="sm"
        :disabled="acting"
        @click="emit('portal')"
      >
        Open billing portal
      </Button>
    </div>

    <div class="overflow-hidden rounded-xl border border-border bg-card">
      <div
        v-if="billing"
        class="grid gap-px border-b border-border bg-border sm:grid-cols-3"
      >
        <div class="bg-card px-4 py-3">
          <p class="text-xs text-muted-foreground">Workspaces</p>
          <p class="mt-1 text-sm font-medium text-foreground">
            {{ limitLabel(billing.usage.workspaces, billing.limits.workspaces) }}
          </p>
        </div>
        <div class="bg-card px-4 py-3">
          <p class="text-xs text-muted-foreground">Projects</p>
          <p class="mt-1 text-sm font-medium text-foreground">
            {{ limitLabel(billing.usage.projects, billing.limits.projects) }}
          </p>
        </div>
        <div class="bg-card px-4 py-3">
          <p class="text-xs text-muted-foreground">Members</p>
          <p class="mt-1 text-sm font-medium text-foreground">
            {{ limitLabel(billing.usage.members, billing.limits.members) }}
          </p>
        </div>
      </div>

      <div v-if="canManage" class="space-y-4 px-4 py-4">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p class="text-sm text-muted-foreground">
            Team and Business are billed per member.
          </p>
          <Tabs
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

        <div class="grid gap-3 sm:grid-cols-2">
          <div class="rounded-lg border border-border p-4">
            <p class="text-sm font-medium text-foreground">Team</p>
            <p class="mt-1 text-2xl font-semibold tracking-tight">
              ${{ PLAN_PRICES.team[interval] }}
              <span class="text-sm font-normal text-muted-foreground">
                / member / month
              </span>
            </p>
            <Button
              class="mt-4 w-full"
              size="sm"
              :disabled="acting || loading || billing?.plan === 'team'"
              @click="emit('checkout', 'team', interval)"
            >
              {{ billing?.plan === "team" ? "Current plan" : "Upgrade to Team" }}
            </Button>
          </div>
          <div class="rounded-lg border border-border p-4">
            <p class="text-sm font-medium text-foreground">Business</p>
            <p class="mt-1 text-2xl font-semibold tracking-tight">
              ${{ PLAN_PRICES.business[interval] }}
              <span class="text-sm font-normal text-muted-foreground">
                / member / month
              </span>
            </p>
            <Button
              class="mt-4 w-full"
              size="sm"
              variant="outline"
              :disabled="acting || loading || billing?.plan === 'business'"
              @click="emit('checkout', 'business', interval)"
            >
              {{
                billing?.plan === "business"
                  ? "Current plan"
                  : "Upgrade to Business"
              }}
            </Button>
          </div>
        </div>
      </div>
      <p v-else class="px-4 py-4 text-xs text-muted-foreground">
        Only the workspace owner can change the plan.
      </p>
    </div>
  </section>
</template>
