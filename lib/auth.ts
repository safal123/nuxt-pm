import { betterAuth } from 'better-auth'
import { APIError } from 'better-auth/api'
import { prismaAdapter } from 'better-auth/adapters/prisma'
// Relative, not aliased: the `auth` CLI loads this file outside the Nuxt build.
import { systemPrisma as prisma } from './prisma'
import { generateSubdomain, isSubdomainTaken } from './subdomain'
import { appCookieDomain, normalizeSubdomain, subdomainError } from '../utils/subdomain'

const googleClientId = process.env.GOOGLE_CLIENT_ID
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET

/** Google is only registered when credentials exist, so the app still boots without them. */
export const googleEnabled = Boolean(googleClientId && googleClientSecret)

/** e.g. `workflow.com` or `lvh.me:3000`. Unset = single-host mode, no subdomains. */
const appDomain = process.env.APP_DOMAIN || ''
const appProtocol = process.env.BETTER_AUTH_URL?.startsWith('https') ? 'https' : 'http'

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: appDomain ? [`${appProtocol}://*.${appDomain}`] : [],
  advanced: appDomain
    ? { crossSubDomainCookies: { enabled: true, domain: appCookieDomain(appDomain) } }
    : {},
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const requested =
            typeof user.subdomain === 'string' ? normalizeSubdomain(user.subdomain) : ''

          if (!requested) {
            // Google sign-up has no form field; derive one from the profile.
            return { data: { ...user, subdomain: await generateSubdomain(user.name || user.email) } }
          }

          const message = subdomainError(requested)
          if (message) throw new APIError('BAD_REQUEST', { message })
          if (await isSubdomainTaken(requested)) {
            throw new APIError('BAD_REQUEST', { message: 'That subdomain is already taken.' })
          }
          return { data: { ...user, subdomain: requested } }
        },
      },
      update: {
        // Changing it is a paid feature owned by PUT /api/users/subdomain.
        before: async (user) => {
          if (user.subdomain === undefined) return
          throw new APIError('FORBIDDEN', {
            message: 'Change your subdomain from Settings.',
          })
        },
      },
    },
    session: {
      create: {
        // Accounts from before per-user subdomains get one at sign-in, so the
        // session the client reads next already knows where to redirect.
        after: async (session) => {
          const user = await prisma.user.findUnique({
            where: { id: session.userId },
            select: { subdomain: true, name: true, email: true },
          })
          if (!user || user.subdomain) return
          await prisma.user.update({
            where: { id: session.userId },
            data: { subdomain: await generateSubdomain(user.name || user.email) },
          })
        },
      },
    },
  },
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: googleEnabled
    ? {
      google: {
        clientId: googleClientId!,
        clientSecret: googleClientSecret!,
        prompt: 'select_account',
      },
    }
    : {},
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ['google'],
      // Password sign-up does not verify email, so require that or Google
      // cannot attach to an existing account with the same address.
      requireLocalEmailVerified: false,
    },
  },
  user: {
    // The app owns these columns; Better Auth only needs to leave them alone.
    additionalFields: {
      // Validated and made unique in `databaseHooks.user.create.before`.
      subdomain: { type: 'string', required: false, input: true },
      activeWorkspaceId: { type: 'string', required: false, input: false },
      activeProjectId: { type: 'string', required: false, input: false },
    },
  },
})
