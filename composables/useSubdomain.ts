import { api } from '~/lib/api'
import { apexOrigin, subdomainFromHost, subdomainOrigin } from '~/utils/subdomain'

/**
 * Host-aware helpers for per-user subdomains (john.<appDomain>).
 * With `APP_DOMAIN` unset everything stays on the current host.
 */
export const useSubdomain = () => {
  const config = useRuntimeConfig().public
  const appDomain = String(config.appDomain || '')
  const protocol = String(config.appProtocol || 'http')
  const enabled = Boolean(appDomain)
  const requestUrl = useRequestURL()

  const currentSubdomain = enabled ? subdomainFromHost(requestUrl.host, appDomain) : null

  const subdomainUrl = (subdomain: string, path = '/w') =>
    enabled ? `${subdomainOrigin(subdomain, appDomain, protocol)}${path}` : path

  const apexUrl = (path = '/') => (enabled ? `${apexOrigin(appDomain, protocol)}${path}` : path)

  /** Full-page hop so the browser lands on the other host; same host = SPA navigation. */
  const goToSubdomain = (subdomain: string | null | undefined, path = '/w') => {
    if (!enabled || !subdomain || subdomain === currentSubdomain) {
      return navigateTo(path)
    }
    return navigateTo(subdomainUrl(subdomain, path), { external: true })
  }

  const checkSubdomain = (subdomain: string) =>
    api<{ subdomain: string; available: boolean }>('/api/subdomains/check', {
      query: { subdomain },
    })

  return {
    enabled,
    appDomain,
    currentSubdomain,
    subdomainUrl,
    apexUrl,
    goToSubdomain,
    checkSubdomain,
  }
}
