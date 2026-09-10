import { serializeAppUser } from '~/server/utils/person'

export default defineApi({
  handler: async ({ user }) => ({
    data: { user: serializeAppUser(user) },
    message: 'User fetched successfully',
  }),
})
