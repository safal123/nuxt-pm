import { billingSyncSchema } from "~/server/utils/schemas";
import { upsertSubscriptionFromStripe } from "~/server/utils/billing";
import { getStripe } from "~/server/utils/stripe";

export default defineApi({
  body: billingSyncSchema,
  handler: async ({ user, body }) => {
    const session = await getStripe().checkout.sessions.retrieve(body.sessionId, {
      expand: ["subscription"],
    });

    if (session.client_reference_id && session.client_reference_id !== user.id) {
      throw createError({
        statusCode: 403,
        message: "This checkout session belongs to another account.",
      });
    }

    const subscription = session.subscription;
    if (!subscription || typeof subscription === "string") {
      throw createError({
        statusCode: 400,
        message: "This checkout session has no subscription yet.",
      });
    }

    const customerId =
      typeof session.customer === "string"
        ? session.customer
        : session.customer?.id;
    if (!customerId) {
      throw createError({
        statusCode: 400,
        message: "This checkout session has no customer.",
      });
    }

    await upsertSubscriptionFromStripe(user.id, customerId, subscription);

    return {
      data: { ok: true },
      message: "Subscription synced",
    };
  },
});
