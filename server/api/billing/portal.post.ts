import { getStripe } from "~/server/utils/stripe";
import {
  billingReturnPath,
  logBillingEvent,
} from "~/server/utils/billing";
import prisma from "~/lib/prisma";

export default defineApi({
  handler: async ({ user, event }) => {
    const origin = getRequestURL(event).origin;
    const record = await prisma.subscription.findUnique({
      where: { userId: user.id },
    });
    if (!record?.stripeCustomerId) {
      throw createError({
        statusCode: 400,
        message: "No billing account yet. Choose a paid plan first.",
      });
    }

    await logBillingEvent({
      userId: user.id,
      type: "portal_opened",
      message: "Opened the Stripe billing portal",
    });

    const returnPath = await billingReturnPath(user.id);
    const returnUrl = `${origin}${returnPath}`;

    const session = await getStripe().billingPortal.sessions.create({
      customer: record.stripeCustomerId,
      return_url: returnUrl,
    }).catch(async (error) => {
      const message = String(error?.message || "");
      if (!message.toLowerCase().includes("configuration")) throw error;
      await getStripe().billingPortal.configurations.create({
        business_profile: { headline: "Northstar billing" },
        features: {
          customer_update: {
            enabled: true,
            allowed_updates: ["email", "address"],
          },
          invoice_history: { enabled: true },
          payment_method_update: { enabled: true },
          subscription_cancel: { enabled: true },
        },
      });
      return getStripe().billingPortal.sessions.create({
        customer: record.stripeCustomerId,
        return_url: returnUrl,
      });
    });

    return {
      data: { url: session.url },
      message: "Billing portal session created",
    };
  },
});
