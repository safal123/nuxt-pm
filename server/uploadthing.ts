import { createUploadthing } from 'uploadthing/h3'
import type { FileRouter } from 'uploadthing/h3'
import { UploadThingError } from 'uploadthing/server'
import { z } from 'zod'
import prisma from '~/lib/prisma'
import { ATTACHABLE_TYPES, validateAttachableAccess } from '~/server/utils/attachment'
import { validateAndGetUser } from '~/server/utils/user'
import { logActivity } from '~/server/utils/activity'
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
        const access = await validateAttachableAccess(input.attachableType, input.attachableId, user.id)
        return {
          userId: user.id,
          attachableType: input.attachableType,
          attachableId: input.attachableId,
          workspaceId: access.workspaceId,
          projectId: access.projectId,
          taskId: access.taskId,
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

      await logActivity({
        workspaceId: metadata.workspaceId,
        projectId: metadata.projectId,
        taskId: metadata.taskId,
        userId: metadata.userId,
        type: 'ATTACHMENT_ADDED',
        message: `attached ${file.name}`,
        metadata: { name: file.name, url: file.ufsUrl },
      })

      return { uploadedBy: metadata.userId }
    }),

  avatar: f(
    {
      image: {
        maxFileSize: '2MB',
        maxFileCount: 1,
      },
    },
    { awaitServerData: true }
  )
    .middleware(async ({ event }) => {
      try {
        const user = await validateAndGetUser(event)
        return { userId: user.id }
      } catch (error: any) {
        throw new UploadThingError(error?.message || 'Unauthorized')
      }
    })
    .onUploadComplete(async ({ metadata, file }) => {
      await prisma.user.update({
        where: { id: metadata.userId },
        data: { image: file.ufsUrl },
      })

      return { image: file.ufsUrl }
    })
} satisfies FileRouter

export type UploadRouter = typeof uploadRouter
