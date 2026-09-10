import Stripe from "stripe";
import {
  PLAN_PRICES,
  STRIPE_LOOKUP_KEYS,
  isPlanInterval,
  monthlyUnitAmount,
  yearlyUnitAmount,
  type PlanInterval,
} from "~/utils/plans";

let stripe: Stripe | null = null;

export const getStripe = () => {
  if (stripe) return stripe;
  const { stripeSecretKey } = useRuntimeConfig();
  if (!stripeSecretKey) {
    throw createError({
      statusCode: 500,
      message: "Stripe is not configured. Add STRIPE_SECRET_KEY to your environment.",
    });
  }
  stripe = new Stripe(stripeSecretKey);
  return stripe;
};

const priceCache = new Map<string, string>();

const paidPlanName = (plan: "team" | "business") =>
  plan === "team" ? "Northstar Team" : "Northstar Business";

const ensurePrice = async (
  plan: "team" | "business",
  interval: PlanInterval,
) => {
  const lookupKey = STRIPE_LOOKUP_KEYS[plan][interval];
  const cached = priceCache.get(lookupKey);
  if (cached) return cached;

  const client = getStripe();
  const existing = await client.prices.list({
    lookup_keys: [lookupKey],
    limit: 1,
  });
  if (existing.data[0]) {
    priceCache.set(lookupKey, existing.data[0].id);
    return existing.data[0].id;
  }

  const product = await client.products.create({
    name: paidPlanName(plan),
    metadata: { plan },
  });
  const monthly = PLAN_PRICES[plan][interval];
  try {
    const price = await client.prices.create({
      product: product.id,
      currency: "usd",
      unit_amount:
        interval === "year"
          ? yearlyUnitAmount(monthly)
          : monthlyUnitAmount(monthly),
      recurring: { interval },
      lookup_key: lookupKey,
      transfer_lookup_key: true,
      metadata: { plan, interval },
    });
    priceCache.set(lookupKey, price.id);
    return price.id;
  } catch {
    const retry = await client.prices.list({
      lookup_keys: [lookupKey],
      limit: 1,
    });
    if (retry.data[0]) {
      priceCache.set(lookupKey, retry.data[0].id);
      return retry.data[0].id;
    }
    throw createError({
      statusCode: 500,
      message: "Could not create a Stripe price for this plan.",
    });
  }
};

export const getStripePriceId = (plan: "team" | "business", interval: PlanInterval) =>
  ensurePrice(plan, interval);

export const periodEndFromSubscription = (subscription: Stripe.Subscription) => {
  const itemEnd = subscription.items.data[0]?.current_period_end;
  const fallback = (subscription as { current_period_end?: number }).current_period_end;
  const end = itemEnd ?? fallback;
  return end ? new Date(end * 1000) : null;
};

export const planFromSubscription = (subscription: Stripe.Subscription) => {
  const fromMeta = subscription.metadata?.plan;
  if (fromMeta === "team" || fromMeta === "business") return fromMeta;
  const lookup = subscription.items.data[0]?.price?.lookup_key || "";
  if (lookup.includes("business")) return "business" as const;
  return "team" as const;
};

export const intervalFromSubscription = (
  subscription: Stripe.Subscription,
): PlanInterval | null => {
  const raw = String(
    subscription.items.data[0]?.price?.recurring?.interval || "",
  );
  return isPlanInterval(raw) ? raw : null;
};
