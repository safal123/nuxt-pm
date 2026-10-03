import { timingSafeEqual } from 'node:crypto'
import { runReminderDigests } from '~/server/utils/reminders'
import { cronRemindersQuerySchema } from '~/server/utils/schemas'
import { apexOrigin, subdomainOrigin } from '~/utils/subdomain'

const authorized = (header: string | undefined, secret: string) => {
  const expected = Buffer.from(`Bearer ${secret}`)
  const received = Buffer.from(header ?? '')
  return received.length === expected.length && timingSafeEqual(received, expected)
}

/**
 * Daily reminder digests. Vercel Cron calls this with
 * `Authorization: Bearer $CRON_SECRET`; any other scheduler can do the same.
 */
export default defineApi({
  auth: false,
  query: cronRemindersQuerySchema,
  handler: async ({ event, query }) => {
    const secret = process.env.CRON_SECRET?.trim()
    if (!secret) {
      throw createError({ statusCode: 503, message: 'CRON_SECRET is not configured.' })
    }
    if (!authorized(getRequestHeader(event, 'authorization'), secret)) {
      throw createError({ statusCode: 401, message: 'Unauthorized' })
    }

    const { appDomain, appProtocol } = useRuntimeConfig(event).public
    const requestUrl = getRequestURL(event)
    const fallbackOrigin = `${requestUrl.protocol}//${requestUrl.host}`

    const result = await runReminderDigests({
      dryRun: query.dryRun,
      now: process.env.NODE_ENV === 'production' ? undefined : query.now,
      origin: (user) => {
        if (!appDomain) return fallbackOrigin
        return user.subdomain
          ? subdomainOrigin(user.subdomain, String(appDomain), String(appProtocol))
          : apexOrigin(String(appDomain), String(appProtocol))
      },
    })

    return { data: result, message: query.dryRun ? 'Reminder dry run' : 'Reminders processed' }
  },
})
