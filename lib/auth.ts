import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
// Relative, not aliased: the `auth` CLI loads this file outside the Nuxt build.
import prisma from './prisma'

const googleClientId = process.env.GOOGLE_CLIENT_ID
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET

/** Google is only registered when credentials exist, so the app still boots without them. */
export const googleEnabled = Boolean(googleClientId && googleClientSecret)

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
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
      activeWorkspaceId: { type: 'string', required: false, input: false },
      activeProjectId: { type: 'string', required: false, input: false },
    },
  },
})
