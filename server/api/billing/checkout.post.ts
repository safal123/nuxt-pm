import {
  billingCheckoutSchema,
} from "~/server/utils/schemas";
import {
  billingReturnPath,
  countBillableSeats,
  ensureStripeCustomer,
  getSubscriptionRecord,
  logBillingEvent,
  upsertSubscriptionFromStripe,
} from "~/server/utils/billing";
import { getStripe, getStripePriceId } from "~/server/utils/stripe";
import { hasPaidAccess } from "~/utils/plans";

export default defineApi({
  body: billingCheckoutSchema,
  handler: async ({ user, event, body }) => {
    const origin = getRequestURL(event).origin;
    const customerId = await ensureStripeCustomer(user);
    const priceId = await getStripePriceId(body.plan, body.interval);
    const seats = await countBillableSeats(user.id);
    const existing = await getSubscriptionRecord(user.id);

    if (
      existing?.stripeSubscriptionId &&
      hasPaidAccess(existing) &&
      existing.plan === body.plan &&
      existing.interval === body.interval
    ) {
      return {
        data: { url: null, alreadyActive: true },
        message: `You are already on ${body.plan}.`,
      };
    }

    await logBillingEvent({
      userId: user.id,
      type: "checkout_started",
      message: `Clicked ${existing && hasPaidAccess(existing) ? "change" : "upgrade"} to ${body.plan} (${body.interval === "year" ? "yearly" : "monthly"})`,
      metadata: { plan: body.plan, interval: body.interval },
    });

    if (existing?.stripeSubscriptionId && hasPaidAccess(existing)) {
      const stripe = getStripe();
      const subscription = await stripe.subscriptions.retrieve(
        existing.stripeSubscriptionId,
      );
      const itemId = subscription.items.data[0]?.id;
      if (!itemId) {
        throw createError({
          statusCode: 500,
          message: "Could not update this subscription. Open the billing portal instead.",
        });
      }

      const updated = await stripe.subscriptions.update(existing.stripeSubscriptionId, {
        items: [{ id: itemId, price: priceId, quantity: seats }],
        proration_behavior: "create_prorations",
        metadata: { userId: user.id, plan: body.plan },
      });
      await upsertSubscriptionFromStripe(user.id, customerId, updated);

      return {
        data: { url: null, updated: true },
        message: `Updated to ${body.plan}.`,
      };
    }

    const returnPath = await billingReturnPath(user.id);
    const session = await getStripe().checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: user.id,
      allow_promotion_codes: true,
      line_items: [{ price: priceId, quantity: Math.max(1, seats) }],
      success_url: `${origin}${returnPath}?billing=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}${returnPath}?billing=cancel`,
      metadata: { userId: user.id, plan: body.plan },
      subscription_data: {
        metadata: { userId: user.id, plan: body.plan },
      },
    });

    if (!session.url) {
      throw createError({
        statusCode: 500,
        message: "Stripe did not return a checkout URL.",
      });
    }

    return {
      data: { url: session.url },
      message: "Checkout session created",
    };
  },
});
