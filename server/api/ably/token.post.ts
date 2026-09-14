import { ablyTokenSchema } from "~/server/utils/schemas";
import {
  projectChannel,
  userChannel,
  workspaceChannel,
} from "~/utils/realtime";

export default defineApi({
  body: ablyTokenSchema,
  handler: async ({ user, body }) => {
    const channels = [userChannel(user.id)];

    if (body.workspaceId) {
      await validateWorkspaceAccess(body.workspaceId, user.id);
      channels.push(workspaceChannel(body.workspaceId));
    }

    if (body.projectId) {
      await validateProjectAccess(body.projectId, user.id);
      channels.push(projectChannel(body.projectId));
    }

    const tokenRequest = await createAblyTokenRequest({
      clientId: body.clientId,
      channels,
    });

    return {
      data: tokenRequest,
      message: "Ably token created",
    };
  },
});
