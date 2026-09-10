<script setup lang="ts">
import type { BillingInvoice } from "@/types";
import { ExternalLinkIcon } from "lucide-vue-next";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/utils/date";
import { formatMoney } from "@/utils/plans";
import { invoiceStatusChip } from "@/utils/table-chips";

const props = defineProps<{
  invoices: BillingInvoice[];
  upcoming: BillingInvoice | null;
  loading: boolean;
  canManage: boolean;
}>();

const amountFor = (invoice: BillingInvoice) => {
  const cents =
    invoice.status === "paid" ? invoice.amountPaid : invoice.amountDue;
  return formatMoney(cents, invoice.currency);
};
</script>

<template>
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
          <TableEmpty v-if="loading && !invoices.length" :colspan="5">
            <span class="text-muted-foreground">Loading invoices…</span>
          </TableEmpty>
          <TableEmpty v-else-if="!canManage" :colspan="5">
            <span class="text-muted-foreground">
              Invoice history is only visible to the workspace owner.
            </span>
          </TableEmpty>
          <TableEmpty v-else-if="!upcoming && !invoices.length" :colspan="5">
            <span class="text-muted-foreground">
              No invoices yet. Upgrade above to start billing.
            </span>
          </TableEmpty>
          <template v-else>
            <TableRow v-if="upcoming">
              <TableCell class="text-sm font-medium text-foreground">
                {{ upcoming.number || "Upcoming" }}
              </TableCell>
              <TableCell class="text-sm text-muted-foreground">
                {{ upcoming.periodEnd ? formatDate(upcoming.periodEnd) : "—" }}
              </TableCell>
              <TableCell>
                <span :class="invoiceStatusChip('upcoming')">Upcoming</span>
              </TableCell>
              <TableCell class="text-right text-sm tabular-nums">
                {{ amountFor(upcoming) }}
              </TableCell>
              <TableCell />
            </TableRow>
            <TableRow v-for="invoice in invoices" :key="invoice.id">
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
                  :href="invoice.hostedInvoiceUrl || invoice.invoicePdf || '#'"
                  target="_blank"
                  rel="noreferrer"
                  class="inline-flex items-center gap-1 text-xs font-medium hover:underline"
                >
                  View
                  <ExternalLinkIcon class="h-3 w-3" />
                </a>
              </TableCell>
            </TableRow>
          </template>
        </TableBody>
      </Table>
    </div>
  </section>
</template>
