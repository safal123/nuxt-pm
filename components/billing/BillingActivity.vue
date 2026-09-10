<script setup lang="ts">
import type { BillingEventItem } from "@/types";
import { formatDate, relativeDate } from "@/utils/date";
import { formatMoney } from "@/utils/plans";
import { billingEventChip } from "@/utils/table-chips";

defineProps<{
  events: BillingEventItem[];
  loading: boolean;
  canManage: boolean;
}>();

const eventLabel = (type: string) => type.replace(/_/g, " ");
</script>

<template>
  <section class="space-y-3">
    <div>
      <h2 class="text-base font-semibold text-foreground">Billing activity</h2>
      <p class="mt-0.5 text-sm text-muted-foreground">
        Clicks, plan changes, payments, and portal visits.
      </p>
    </div>
    <div class="overflow-hidden rounded-xl border border-border bg-card">
      <div
        v-if="loading && !events.length"
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
        v-else-if="!events.length"
        class="px-4 py-8 text-center text-sm text-muted-foreground"
      >
        Nothing yet. Upgrade or open the portal and events will land here.
      </div>
      <ul v-else class="divide-y divide-border">
        <li
          v-for="event in events"
          :key="event.id"
          class="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start sm:justify-between"
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
    </div>
  </section>
</template>
