import prisma from '~/lib/prisma'
import { utapi } from '~/server/utils/utapi'

export default defineEventHandler(async (event) => {
  try {
    const user = await validateAndGetUser(event)
    const attachmentId = getRouterParam(event, 'attachmentId') as string

    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId }
    })

    if (!attachment) {
      throw createError({
        statusCode: 404,
        message: 'Attachment not found.'
      })
    }

    const access = await validateAttachableAccess(
      attachment.attachableType,
      attachment.attachableId,
      user.id
    )

    const canDelete = attachment.uploadedBy === user.id || access.ownerId === user.id
    if (!canDelete) {
      throw createError({
        statusCode: 403,
        message: 'You can only remove files you uploaded.'
      })
    }

    if (attachment.fileKey) {
      try {
        await utapi.deleteFiles(attachment.fileKey)
      } catch (error) {
        console.error('Failed to delete file from UploadThing:', error)
      }
    }

    await prisma.attachment.delete({
      where: { id: attachment.id }
    })

    if (attachment.attachableType === 'Task') {
      await logTaskActivity({
        taskId: attachment.attachableId,
        userId: user.id,
        type: 'ATTACHMENT_REMOVED',
        message: `removed ${attachment.name}`,
        metadata: { name: attachment.name }
      })
    }

    return {
      data: {
        attachment: {
          id: attachment.id,
          attachableType: attachment.attachableType,
          attachableId: attachment.attachableId
        }
      },
      message: 'Attachment removed'
    }
  } catch (error: any) {
    console.error('Failed to delete attachment:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error'
    })
  }
})
