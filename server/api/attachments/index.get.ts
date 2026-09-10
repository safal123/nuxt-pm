import { attachmentsQuerySchema } from '~/server/utils/schemas'

export default defineApi({
  query: attachmentsQuerySchema,
  handler: async ({ user, query }) => {
    await validateAttachableAccess(query.attachableType, query.attachableId, user.id)
    const attachments = await listAttachments(query.attachableType, query.attachableId)

    return {
      data: { attachments: attachments.map(serializeAttachment) },
      message: 'Attachments fetched',
    }
  },
})
