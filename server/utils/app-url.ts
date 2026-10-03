import type { H3Event } from 'h3'
import { apexOrigin } from '~/utils/subdomain'

/**
 * Origin for links sent to other people (emails, invites). Uses the apex so a
 * recipient is not dropped on the sender's subdomain; the auth middleware then
 * moves them to their own.
 */
export const sharedAppOrigin = (event: H3Event) => {
  const { appDomain, appProtocol } = useRuntimeConfig(event).public
  if (appDomain) return apexOrigin(String(appDomain), String(appProtocol))
  const requestUrl = getRequestURL(event)
  return `${requestUrl.protocol}//${requestUrl.host}`
}
