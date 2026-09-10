import { billingQuerySchema } from "~/server/utils/schemas";
import {
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

    const [billing, documents, events] = await Promise.all([
      serializeBilling(billedUserId, query.workspaceId),
      canManage
        ? listBillingDocuments(billedUserId)
        : Promise.resolve({ invoices: [], upcoming: null }),
      canManage ? listBillingEvents(billedUserId) : Promise.resolve([]),
    ]);

    return {
      data: {
        billing: {
          ...billing,
          ...documents,
          ...billingMoneySummary(billing, documents),
          events,
          canManage,
        },
      },
      message: "Billing fetched successfully",
    };
  },
});
