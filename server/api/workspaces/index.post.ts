import { workspaceCreateSchema } from '~/server/utils/schemas'
import { createWorkspace } from '~/server/utils/workspace'

export default defineApi({
  body: workspaceCreateSchema,
  handler: async ({ user, body }) => {
    const workspace = await createWorkspace({
      userId: user.id,
      name: body.name,
      description: body.description,
    })

    return {
      data: { workspace },
      message: 'Workspace created successfully',
      status: 201,
    }
  },
})
