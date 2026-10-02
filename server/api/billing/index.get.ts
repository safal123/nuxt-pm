import { billingQuerySchema } from "~/server/utils/schemas";
import {
  BILLING_EVENTS_PAGE_SIZE,
  billingMoneySummary,
  listBillingDocuments,
  listBillingEvents,
  serializeBilling,
} from "~/server/utils/billing";

export default defineApi({
  query: billingQuerySchema,
  handler: async ({ user, query }) => {
    let billedUserId = user.id;
    let canManage = false;

    if (query.workspaceId) {
      const workspace = await validateWorkspaceAccess(
        query.workspaceId,
        user.id,
      );
      billedUserId = workspace.createdBy;
      canManage = workspace.createdBy === user.id;
    } else {
      canManage = true;
    }

    const [billing, documents, activity] = await Promise.all([
      serializeBilling(billedUserId, query.workspaceId),
      canManage
        ? listBillingDocuments(billedUserId)
        : Promise.resolve({ invoices: [], upcoming: null }),
      canManage
        ? listBillingEvents(billedUserId, {
            page: 1,
            limit: BILLING_EVENTS_PAGE_SIZE,
          })
        : Promise.resolve({
            events: [],
            total: 0,
            page: 1,
            hasMore: false,
          }),
    ]);

    return {
      data: {
        billing: {
          ...billing,
          ...documents,
          ...billingMoneySummary(billing, documents),
          events: activity.events,
          eventsTotal: activity.total,
          eventsHasMore: activity.hasMore,
          canManage,
        },
      },
      message: "Billing fetched successfully",
    };
  },
});
