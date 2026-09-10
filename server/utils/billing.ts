import type Stripe from "stripe";
import prisma from "~/lib/prisma";
import {
  canAddWithinLimit,
  effectivePlan,
  formatMoney,
  isPaidPlan,
  planLimits,
  type PlanId,
} from "~/utils/plans";
import {
  getStripe,
  intervalFromSubscription,
  periodEndFromSubscription,
  planFromSubscription,
} from "~/server/utils/stripe";

export const countOwnedWorkspaces = (userId: string) =>
  prisma.workspace.count({ where: { createdBy: userId } });

export const countWorkspaceProjects = (workspaceId: string) =>
  prisma.project.count({
    where: { workspaceId, archivedAt: null },
  });

export const countWorkspaceMembers = async (workspaceId: string) => {
  const workspace = await prisma.workspace.findUniqueOrThrow({
    where: { id: workspaceId },
    select: { createdBy: true },
  });
  const members = await prisma.workspaceMember.count({ where: { workspaceId } });
  if (members === 0) return 1;
  const ownerRow = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: {
        userId: workspace.createdBy,
        workspaceId,
      },
    },
  });
  return ownerRow ? members : members + 1;
};

export const countBillableSeats = async (userId: string) => {
  const members = await prisma.workspaceMember.findMany({
    where: { workspace: { createdBy: userId } },
    select: { userId: true },
  });
  const unique = new Set(members.map((member) => member.userId));
  unique.add(userId);
  return unique.size;
};

export const getSubscriptionRecord = (userId: string) =>
  prisma.subscription.findUnique({ where: { userId } });

export const logBillingEvent = async (input: {
  userId: string;
  type: string;
  message: string;
  amount?: number | null;
  currency?: string | null;
  stripeEventId?: string | null;
  metadata?: Record<string, unknown>;
}) => {
  if (input.stripeEventId) {
    const existing = await prisma.billingEvent.findUnique({
      where: { stripeEventId: input.stripeEventId },
    });
    if (existing) return existing;
  }

  return prisma.billingEvent.create({
    data: {
      userId: input.userId,
      type: input.type,
      message: input.message,
      amount: input.amount ?? null,
      currency: input.currency ?? null,
      stripeEventId: input.stripeEventId ?? null,
      metadata: (input.metadata ?? undefined) as object | undefined,
    },
  });
};

export const listBillingEvents = async (userId: string) => {
  const events = await prisma.billingEvent.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return events.map((event) => ({
    id: event.id,
    type: event.type,
    message: event.message,
    amount: event.amount,
    currency: event.currency,
    createdAt: event.createdAt.toISOString(),
    metadata: (event.metadata as Record<string, unknown> | null) ?? null,
  }));
};

export const billingReturnPath = async (userId: string) => {
  const workspace = await prisma.workspace.findFirst({
    where: { createdBy: userId },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  return workspace ? `/w/${workspace.id}/billing` : "/w";
};

export const userIdFromStripeCustomer = async (customerId: string | null) => {
  if (!customerId) return null;
  const record = await prisma.subscription.findUnique({
    where: { stripeCustomerId: customerId },
    select: { userId: true },
  });
  return record?.userId ?? null;
};

export const getEffectivePlanForUser = async (userId: string): Promise<PlanId> => {
  const record = await getSubscriptionRecord(userId);
  return effectivePlan(record);
};

export const getEffectivePlanForWorkspace = async (workspaceId: string) => {
  const workspace = await prisma.workspace.findUniqueOrThrow({
    where: { id: workspaceId },
    select: { createdBy: true },
  });
  const plan = await getEffectivePlanForUser(workspace.createdBy);
  return { ownerId: workspace.createdBy, plan };
};

const limitError = (message: string) =>
  createError({ statusCode: 402, message });

export const assertCanCreateWorkspace = async (userId: string) => {
  const plan = await getEffectivePlanForUser(userId);
  const used = await countOwnedWorkspaces(userId);
  if (canAddWithinLimit(used, planLimits(plan).workspaces)) return;
  throw limitError(
    plan === "team"
      ? "Team includes one workspace. Upgrade to Business for more."
      : "Free includes one workspace. Upgrade to Business for more.",
  );
};

export const assertCanCreateProject = async (workspaceId: string) => {
  const { plan } = await getEffectivePlanForWorkspace(workspaceId);
  const used = await countWorkspaceProjects(workspaceId);
  if (canAddWithinLimit(used, planLimits(plan).projects)) return;
  throw limitError(
    "Free includes 3 projects. Archive one or upgrade to Team for unlimited projects.",
  );
};

export const assertCanAddMember = async (workspaceId: string) => {
  const { plan } = await getEffectivePlanForWorkspace(workspaceId);
  const used = await countWorkspaceMembers(workspaceId);
  if (canAddWithinLimit(used, planLimits(plan).members)) return;
  throw limitError(
    "Free includes 5 members. Upgrade to Team to invite more people.",
  );
};

export const upsertSubscriptionFromStripe = async (
  userId: string,
  customerId: string,
  subscription: Stripe.Subscription,
) => {
  const previous = await getSubscriptionRecord(userId);
  const plan = planFromSubscription(subscription);
  const status = subscription.status;
  const paid = isPaidPlan(plan) && (status === "active" || status === "trialing" || status === "past_due");
  const nextPlan = paid ? plan : "free";
  const seats = subscription.items.data[0]?.quantity ?? 1;

  const next = await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceIdFromSubscription(subscription),
      plan: nextPlan,
      status,
      interval: intervalFromSubscription(subscription),
      seats,
      currentPeriodEnd: periodEndFromSubscription(subscription),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
    update: {
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceIdFromSubscription(subscription),
      plan: nextPlan,
      status,
      interval: intervalFromSubscription(subscription),
      seats,
      currentPeriodEnd: periodEndFromSubscription(subscription),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  });

  const previousPlan = previous ? effectivePlan(previous) : "free";
  if (previousPlan !== nextPlan) {
    if (previousPlan === "free") {
      await logBillingEvent({
        userId,
        type: "subscribed",
        message: `Subscribed to ${nextPlan}`,
        metadata: { plan: nextPlan, interval: next.interval },
      });
    } else if (nextPlan === "free") {
      await logBillingEvent({
        userId,
        type: "canceled",
        message: `Subscription moved from ${previousPlan} to Free`,
        metadata: { from: previousPlan, to: nextPlan },
      });
    } else {
      await logBillingEvent({
        userId,
        type: "plan_changed",
        message: `Changed plan from ${previousPlan} to ${nextPlan}`,
        metadata: { from: previousPlan, to: nextPlan, interval: next.interval },
      });
    }
  } else if (previous && previous.seats !== seats) {
    await logBillingEvent({
      userId,
      type: "seats_updated",
      message: `Updated seats from ${previous.seats} to ${seats}`,
      metadata: { from: previous.seats, to: seats },
    });
  }

  return next;
};

const priceIdFromSubscription = (subscription: Stripe.Subscription) => {
  const price = subscription.items.data[0]?.price;
  return typeof price === "string" ? price : price?.id ?? null;
};

export const markSubscriptionCanceled = async (subscriptionId: string) => {
  const existing = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: subscriptionId },
  });
  if (!existing) return null;
  const updated = await prisma.subscription.update({
    where: { id: existing.id },
    data: {
      plan: "free",
      status: "canceled",
      stripeSubscriptionId: existing.stripeSubscriptionId,
      cancelAtPeriodEnd: false,
    },
  });
  if (existing.plan !== "free") {
    await logBillingEvent({
      userId: existing.userId,
      type: "canceled",
      message: `Canceled the ${existing.plan} plan`,
      metadata: { from: existing.plan },
    });
  }
  return updated;
};

export const ensureStripeCustomer = async (user: {
  id: string;
  email: string;
  name: string | null;
}) => {
  const existing = await getSubscriptionRecord(user.id);
  if (existing?.stripeCustomerId) return existing.stripeCustomerId;

  const customer = await getStripe().customers.create({
    email: user.email,
    name: user.name || undefined,
    metadata: { userId: user.id },
  });

  await prisma.subscription.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      stripeCustomerId: customer.id,
      plan: "free",
      status: "inactive",
    },
    update: { stripeCustomerId: customer.id },
  });

  return customer.id;
};

export const syncSeatQuantity = async (ownerId: string) => {
  const record = await getSubscriptionRecord(ownerId);
  if (!record?.stripeSubscriptionId || !hasPaidAccessSafe(record)) return;

  const seats = await countBillableSeats(ownerId);
  if (seats === record.seats) return;

  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(record.stripeSubscriptionId);
  const itemId = subscription.items.data[0]?.id;
  if (!itemId) return;

  const updated = await stripe.subscriptions.update(record.stripeSubscriptionId, {
    items: [{ id: itemId, quantity: seats }],
    proration_behavior: "create_prorations",
  });
  await upsertSubscriptionFromStripe(ownerId, record.stripeCustomerId, updated);
};

const hasPaidAccessSafe = (record: { plan: string; status: string }) =>
  isPaidPlan(record.plan) &&
  (record.status === "active" ||
    record.status === "trialing" ||
    record.status === "past_due");

export const serializeBilling = async (userId: string, workspaceId?: string) => {
  const record = await getSubscriptionRecord(userId);
  const plan = effectivePlan(record);
  const usageWorkspaces = await countOwnedWorkspaces(userId);
  const usageMembers = workspaceId
    ? await countWorkspaceMembers(workspaceId)
    : await countBillableSeats(userId);
  const usageProjects = workspaceId ? await countWorkspaceProjects(workspaceId) : 0;

  return {
    plan,
    status: record?.status ?? "inactive",
    interval: (record?.interval as "month" | "year" | null) ?? null,
    seats: record?.seats ?? usageMembers,
    currentPeriodEnd: record?.currentPeriodEnd ?? null,
    cancelAtPeriodEnd: record?.cancelAtPeriodEnd ?? false,
    limits: planLimits(plan),
    usage: {
      workspaces: usageWorkspaces,
      projects: usageProjects,
      members: usageMembers,
    },
  };
};

const serializeInvoice = (
  invoice: Stripe.Invoice,
  upcoming = false,
): {
  id: string
  number: string | null
  status: string
  description: string | null
  amountDue: number
  amountPaid: number
  currency: string
  createdAt: string
  periodEnd: string | null
  hostedInvoiceUrl: string | null
  invoicePdf: string | null
  upcoming: boolean
} => ({
  id: invoice.id || `upcoming-${invoice.created}`,
  number: invoice.number ?? null,
  status: upcoming ? "upcoming" : invoice.status || "open",
  description:
    invoice.description ||
    invoice.lines?.data[0]?.description ||
    null,
  amountDue: invoice.amount_due,
  amountPaid: invoice.amount_paid,
  currency: invoice.currency,
  createdAt: new Date(invoice.created * 1000).toISOString(),
  periodEnd: invoice.period_end
    ? new Date(invoice.period_end * 1000).toISOString()
    : null,
  hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
  invoicePdf: invoice.invoice_pdf ?? null,
  upcoming,
});

export const listBillingDocuments = async (userId: string) => {
  const empty = { invoices: [] as ReturnType<typeof serializeInvoice>[], upcoming: null as ReturnType<typeof serializeInvoice> | null };
  try {
    const record = await getSubscriptionRecord(userId);
    if (!record?.stripeCustomerId) return empty;

    const stripe = getStripe();
    const listed = await stripe.invoices.list({
      customer: record.stripeCustomerId,
      limit: 12,
    });

    let upcoming = null as ReturnType<typeof serializeInvoice> | null;
    try {
      const preview = await stripe.invoices.createPreview({
        customer: record.stripeCustomerId,
        ...(record.stripeSubscriptionId
          ? { subscription: record.stripeSubscriptionId }
          : {}),
      });
      upcoming = serializeInvoice(preview, true);
    } catch {
      upcoming = null;
    }

    return {
      invoices: listed.data.map((invoice) => serializeInvoice(invoice)),
      upcoming,
    };
  } catch {
    return empty;
  }
};

export const billingMoneySummary = (
  billing: Awaited<ReturnType<typeof serializeBilling>>,
  documents: Awaited<ReturnType<typeof listBillingDocuments>>,
) => {
  const paidInvoices = documents.invoices.filter((invoice) => invoice.status === "paid");
  const totalPaid = paidInvoices.reduce((sum, invoice) => sum + invoice.amountPaid, 0);
  const periodEnd = billing.currentPeriodEnd
    ? new Date(billing.currentPeriodEnd)
    : null;
  const daysRemaining = periodEnd
    ? Math.max(0, Math.ceil((periodEnd.getTime() - Date.now()) / 86_400_000))
    : 0;
  const periodDays = billing.interval === "year" ? 365 : 30;
  const latestPaid = paidInvoices[0]?.amountPaid ?? 0;
  const remainingValue =
    latestPaid && daysRemaining > 0
      ? Math.round((daysRemaining / periodDays) * latestPaid)
      : 0;

  return {
    totalPaid,
    remainingValue,
    amountDue: documents.upcoming?.amountDue ?? 0,
    daysRemaining,
    currency: documents.upcoming?.currency || paidInvoices[0]?.currency || "usd",
  };
};
