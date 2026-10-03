import { serializeAppUser } from '~/server/utils/person'

export default defineApi({
  handler: async ({ user }) => ({
    data: {
      user: {
        ...serializeAppUser(user),
        canChangeSubdomain: await canChangeSubdomain(user.id),
      },
    },
    message: 'User fetched successfully',
  }),
})
