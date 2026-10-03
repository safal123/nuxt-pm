import { isSubdomainTaken } from '~/lib/subdomain'
import { subdomainCheckSchema } from '~/server/utils/schemas'

export default defineApi({
  auth: false,
  query: subdomainCheckSchema,
  handler: async ({ query }) => {
    const available = !(await isSubdomainTaken(query.subdomain))
    return {
      data: { subdomain: query.subdomain, available },
      message: available ? 'Subdomain is available' : 'That subdomain is already taken.',
    }
  },
})
