import prisma from '~/lib/prisma'
import { workspaceCreateSchema } from '~/server/utils/schemas'

export default defineApi({
  body: workspaceCreateSchema,
  handler: async ({ user, body }) => {
    const workspace = await prisma.workspace.create({
      data: {
        name: body.name,
        description: body.description || null,
        createdBy: user.id,
        members: {
          create: {
            userId: user.id,
            role: 'OWNER',
          },
        },
        settings: {
          create: {},
        },
      },
    })

    return {
      data: { workspace },
      message: 'Workspace created successfully',
      status: 201,
    }
  },
})
