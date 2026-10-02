import {
  BILLING_EVENTS_PAGE_SIZE,
  listBillingEvents,
} from "~/server/utils/billing";
import { billingEventsQuerySchema } from "~/server/utils/schemas";

export default defineApi({
  query: billingEventsQuerySchema,
  handler: async ({ user, query }) => {
    let billedUserId = user.id;
    let canManage = true;

    if (query.workspaceId) {
      const workspace = await validateWorkspaceAccess(
        query.workspaceId,
        user.id,
      );
      billedUserId = workspace.createdBy;
      canManage = workspace.createdBy === user.id;
    }

    if (!canManage) {
      return {
        data: {
          events: [],
          total: 0,
          page: query.page,
          hasMore: false,
        },
        message: "Billing activity is only visible to the workspace owner",
      };
    }

    const result = await listBillingEvents(billedUserId, {
      page: query.page,
      limit: query.limit ?? BILLING_EVENTS_PAGE_SIZE,
    });

    return {
      data: result,
      message: "Billing activity fetched",
    };
  },
});
