import { getStripe } from "~/server/utils/stripe";
import {
  logBillingEvent,
  markSubscriptionCanceled,
  upsertSubscriptionFromStripe,
  userIdFromStripeCustomer,
} from "~/server/utils/billing";
import { formatMoney } from "~/utils/plans";
import type Stripe from "stripe";

const userIdFromSubscription = async (subscription: Stripe.Subscription) => {
  const fromMeta = subscription.metadata?.userId;
  if (fromMeta) return fromMeta;
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id;
  return userIdFromStripeCustomer(customerId ?? null);
};

const syncSubscription = async (subscription: Stripe.Subscription) => {
  const userId = await userIdFromSubscription(subscription);
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id;
  if (!userId || !customerId) return;
  await upsertSubscriptionFromStripe(userId, customerId, subscription);
};

const customerIdFrom = (value: string | Stripe.Customer | Stripe.DeletedCustomer | null) => {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
};

export default defineEventHandler(async (event) => {
  const { stripeWebhookSecret } = useRuntimeConfig();
  if (!stripeWebhookSecret) {
    throw createError({
      statusCode: 500,
      message: "STRIPE_WEBHOOK_SECRET is not configured.",
    });
  }

  const signature = getHeader(event, "stripe-signature");
  const rawBody = await readRawBody(event);
  if (!signature || !rawBody) {
    throw createError({
      statusCode: 400,
      message: "Missing Stripe signature or body.",
    });
  }

  let stripeEvent: Stripe.Event;
  try {
    stripeEvent = getStripe().webhooks.constructEvent(
      rawBody,
      signature,
      stripeWebhookSecret,
    );
  } catch (error: any) {
    throw createError({
      statusCode: 400,
      message: error?.message || "Invalid Stripe signature.",
    });
  }

  switch (stripeEvent.type) {
    case "checkout.session.completed": {
      const session = stripeEvent.data.object as Stripe.Checkout.Session;
      if (session.mode !== "subscription" || !session.subscription) break;
      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription.id;
      const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
      await syncSubscription(subscription);
      const userId =
        session.client_reference_id ||
        (await userIdFromStripeCustomer(customerIdFrom(session.customer)));
      if (userId) {
        await logBillingEvent({
          userId,
          type: "checkout_completed",
          message: `Completed checkout for ${session.metadata?.plan || "a paid plan"}`,
          amount: session.amount_total ?? null,
          currency: session.currency ?? null,
          stripeEventId: stripeEvent.id,
          metadata: { plan: session.metadata?.plan },
        });
      }
      break;
    }
    case "invoice.paid": {
      const invoice = stripeEvent.data.object as Stripe.Invoice;
      const userId = await userIdFromStripeCustomer(customerIdFrom(invoice.customer));
      if (userId) {
        await logBillingEvent({
          userId,
          type: "invoice_paid",
          message: `Paid ${formatMoney(invoice.amount_paid, invoice.currency)}`,
          amount: invoice.amount_paid,
          currency: invoice.currency,
          stripeEventId: stripeEvent.id,
          metadata: { invoiceId: invoice.id, number: invoice.number },
        });
      }
      break;
    }
    case "invoice.payment_failed": {
      const invoice = stripeEvent.data.object as Stripe.Invoice;
      const userId = await userIdFromStripeCustomer(customerIdFrom(invoice.customer));
      if (userId) {
        await logBillingEvent({
          userId,
          type: "invoice_failed",
          message: `Payment failed for ${formatMoney(invoice.amount_due, invoice.currency)}`,
          amount: invoice.amount_due,
          currency: invoice.currency,
          stripeEventId: stripeEvent.id,
          metadata: { invoiceId: invoice.id },
        });
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      await syncSubscription(stripeEvent.data.object as Stripe.Subscription);
      break;
    }
    case "customer.subscription.deleted": {
      const subscription = stripeEvent.data.object as Stripe.Subscription;
      await markSubscriptionCanceled(subscription.id);
      break;
    }
    default:
      break;
  }

  return { received: true };
});
