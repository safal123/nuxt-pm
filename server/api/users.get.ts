import { serializeAppUser } from '~/server/utils/person'
import { resolveUserStatus } from '~/server/utils/user-status'

export default defineApi({
  handler: async ({ user }) => ({
    data: {
      user: {
        ...serializeAppUser({
          ...user,
          status: await resolveUserStatus(user.id),
        }),
        canChangeSubdomain: await canChangeSubdomain(user.id),
      },
    },
    message: 'User fetched successfully',
  }),
})
