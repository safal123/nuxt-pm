/**
 * Access is workspace-scoped: creator or workspace member.
 * Project/task membership alone is not enough.
 */
export const workspaceAccessWhere = (userId: string) => ({
  OR: [{ createdBy: userId }, { members: { some: { userId } } }],
})

export const assertCreator = (createdBy: string, userId: string, noun: string) => {
  if (createdBy !== userId) {
    throw createError({
      statusCode: 403,
      message: `Only the creator can archive or restore this ${noun}.`,
    })
  }
}
