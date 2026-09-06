export default defineEventHandler(async (event) => {
  try {
    const user = await validateAndGetUser(event)
    const query = getQuery(event)
    const attachableType = String(query.attachableType || '')
    const attachableId = String(query.attachableId || '')

    if (!attachableType || !attachableId) {
      throw createError({
        statusCode: 400,
        message: 'attachableType and attachableId are required.'
      })
    }

    await validateAttachableAccess(attachableType, attachableId, user.id)
    const attachments = await listAttachments(attachableType, attachableId)

    return {
      data: { attachments: attachments.map(serializeAttachment) },
      message: 'Attachments fetched'
    }
  } catch (error: any) {
    console.error('Failed to list attachments:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error'
    })
  }
})
