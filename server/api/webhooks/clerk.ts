import prisma from '~/lib/prisma';

export default defineEventHandler(async (event) => {
  const clerkSignature = event.node.req.headers['svix-signature'] as string;
  const clerkWebhookSecret = process.env.NUXT_CLERK_WEBHOOK_SECRET;

  if (!clerkSignature || !clerkWebhookSecret) {
    throw createError({
      statusCode: 400,
      message: 'Missing Clerk webhook signature or secret.'
    });
  }

  const body = await readBody(event);
  const eventType = body.type;

  switch (eventType) {
    case 'user.created':
    case 'user.updated':
      const userData = body.data;

      const user = await prisma.user.upsert({
        where: { clerkId: userData.id }, // Unique identifier to find the user
        update: {
          email: userData.email_addresses[0].email_address,
          name: `${userData.first_name} ${userData.last_name}`,
          clerkObject: userData,
          updatedAt: new Date(),
        },
        create: {
          clerkId: userData.id,
          email: userData.email_addresses[0].email_address,
          name: `${userData.first_name} ${userData.last_name}`,
          clerkObject: userData,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Create a default workspace for the user
      const defaultWorkspace = await prisma.workspace.create({
        data: {
          name: `Workspace`,
          creator: { connect: { id: user.id } },
          members: {
            create: {
              userId: user.id,
              role: 'OWNER',
            },
          },
        },
      });

      // Set the default workspace as the user's active workspace
      await prisma.user.update({
        where: { id: user.id },
        data: {
          activeWorkspaceId: defaultWorkspace.id,
        },
      });

      break;

    default:
      console.warn(`Unhandled event type: ${eventType}`);
      break;
  }

  return {
    data: { success: true },
    message: 'Webhook processed successfully'
  };
});