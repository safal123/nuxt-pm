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
      const email = userData.email_addresses?.[0]?.email_address;
      if (!email) {
        throw createError({
          statusCode: 400,
          message: 'Clerk user does not have an email address',
        });
      }

      const user = await prisma.user.upsert({
        where: { clerkId: userData.id }, // Unique identifier to find the user
        update: {
          email,
          name: `${userData.first_name} ${userData.last_name}`,
          clerkObject: userData,
          updatedAt: new Date(),
        },
        create: {
          clerkId: userData.id,
          email,
          name: `${userData.first_name} ${userData.last_name}`,
          clerkObject: userData,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      await ensureDefaultWorkspace(user);

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