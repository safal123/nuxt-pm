import prisma from '~/lib/prisma'

export const getUserFromClerkId = async (clerkId: string) => {
  return prisma.user.findFirst({
    where: {
      clerkId,
    },
  });
}