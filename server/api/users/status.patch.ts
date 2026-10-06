import { serializeAppUser } from '~/server/utils/person'
import { updateUserStatus } from '~/server/utils/user-status'
import { userStatusSchema } from '~/server/utils/schemas'

export default defineApi({
  body: userStatusSchema,
  handler: async ({ user, body }) => {
    const status = await updateUserStatus(user.id, body)
    return {
      data: { user: serializeAppUser({ ...user, status }) },
      message: 'Status saved',
    }
  },
})
