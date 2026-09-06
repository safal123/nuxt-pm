import { createUploadthing } from 'uploadthing/h3'
import type { FileRouter } from 'uploadthing/h3'
import { UploadThingError } from 'uploadthing/server'
import { z } from 'zod'
import prisma from '~/lib/prisma'
import { ATTACHABLE_TYPES, validateAttachableAccess } from '~/server/utils/attachment'
import { validateAndGetUser } from '~/server/utils/user'
import { logTaskActivity } from '~/server/utils/task'
import { MAX_CARD_FILES, MAX_CARD_FILE_SIZE } from '~/utils/upload-limits'

const f = createUploadthing()

export const uploadRouter = {
  attachment: f(
    {
      blob: {
        maxFileSize: MAX_CARD_FILE_SIZE,
        maxFileCount: MAX_CARD_FILES,
        minFileCount: 1,
      },
    },
    { awaitServerData: true }
  )
    .input(
      z.object({
        attachableType: z.enum(ATTACHABLE_TYPES),
        attachableId: z.string().min(1)
      })
    )
    .middleware(async ({ event, input }) => {
      try {
        const user = await validateAndGetUser(event)
        await validateAttachableAccess(input.attachableType, input.attachableId, user.id)
        return {
          userId: user.id,
          attachableType: input.attachableType,
          attachableId: input.attachableId
        }
      } catch (error: any) {
        throw new UploadThingError(error?.message || 'Unauthorized')
      }
    })
    .onUploadComplete(async ({ metadata, file }) => {
      await prisma.attachment.create({
        data: {
          name: file.name,
          url: file.ufsUrl,
          fileKey: file.key,
          size: file.size,
          mimeType: file.type || null,
          attachableType: metadata.attachableType,
          attachableId: metadata.attachableId,
          uploadedBy: metadata.userId
        }
      })

      if (metadata.attachableType === 'Task') {
        await logTaskActivity({
          taskId: metadata.attachableId,
          userId: metadata.userId,
          type: 'ATTACHMENT_ADDED',
          message: `attached ${file.name}`,
          metadata: { name: file.name, url: file.ufsUrl }
        })
      }

      return { uploadedBy: metadata.userId }
    })
} satisfies FileRouter

export type UploadRouter = typeof uploadRouter
