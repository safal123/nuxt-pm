/**
 * Per-user subdomains: `john` → john.<APP_DOMAIN>.
 *
 * Zod-free so `lib/auth.ts` can import it relatively when the Better Auth CLI
 * loads that file outside the Nuxt build.
 */

export const SUBDOMAIN_MIN_LENGTH = 3
export const SUBDOMAIN_MAX_LENGTH = 30

const SUBDOMAIN_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/

export const RESERVED_SUBDOMAINS = new Set([
  'admin', 'api', 'app', 'assets', 'auth', 'billing', 'blog', 'cdn', 'dashboard',
  'dev', 'docs', 'email', 'ftp', 'help', 'imap', 'invite', 'login', 'mail',
  'ns1', 'ns2', 'pop', 'portal', 'root', 'signin', 'signup', 'smtp', 'staging',
  'static', 'status', 'support', 'test', 'webhooks', 'workflow', 'www',
])

export const normalizeSubdomain = (value: string) => value.trim().toLowerCase()

/** Human-readable reason the label cannot be used, or null when it is valid. */
export const subdomainError = (value: string): string | null => {
  const label = normalizeSubdomain(value)
  if (label.length < SUBDOMAIN_MIN_LENGTH) {
    return `Subdomain must be at least ${SUBDOMAIN_MIN_LENGTH} characters.`
  }
  if (label.length > SUBDOMAIN_MAX_LENGTH) {
    return `Subdomain must be ${SUBDOMAIN_MAX_LENGTH} characters or less.`
  }
  if (!SUBDOMAIN_PATTERN.test(label)) {
    return 'Use lowercase letters, numbers, and hyphens (not at the start or end).'
  }
  if (RESERVED_SUBDOMAINS.has(label)) {
    return 'That subdomain is reserved.'
  }
  return null
}

/** Best-effort label from a name or email; may still need a uniqueness suffix. */
export const slugifySubdomain = (input: string) => {
  const slug = input
    .split('@')[0]!
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SUBDOMAIN_MAX_LENGTH)
    .replace(/-+$/, '')
  if (slug.length < SUBDOMAIN_MIN_LENGTH || RESERVED_SUBDOMAINS.has(slug)) {
    return `${slug || 'user'}-team`.slice(0, SUBDOMAIN_MAX_LENGTH)
  }
  return slug
}

/** `APP_DOMAIN` without a port, for cookie `Domain`. */
/** Hosts that cannot serve `*.host` wildcards, so per-user subdomains stay off. */
const NO_WILDCARD_SUFFIXES = ['.vercel.app']

/**
 * `APP_DOMAIN` as a bare `host[:port]`. Tolerates a pasted URL
 * ("https://app.com/") and returns "" for hosts without wildcard support.
 */
export const normalizeAppDomain = (value: string | undefined | null) => {
  const host = (value ?? '')
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, '')
    .replace(/\/.*$/, '')
  if (!host) return ''
  const hostname = host.split(':')[0]!
  if (NO_WILDCARD_SUFFIXES.some((suffix) => hostname.endsWith(suffix))) return ''
  return host
}

export const appCookieDomain = (appDomain: string) => appDomain.split(':')[0]!

/**
 * Tenant label for a request host, or null on the apex / unrelated hosts.
 * `john.workflow.com` with appDomain `workflow.com` → `john`.
 */
export const subdomainFromHost = (host: string, appDomain: string) => {
  if (!host || !appDomain) return null
  const normalizedHost = host.toLowerCase()
  const suffix = `.${appDomain.toLowerCase()}`
  if (!normalizedHost.endsWith(suffix)) return null
  const label = normalizedHost.slice(0, -suffix.length)
  if (!label || label.includes('.')) return null
  return label
}

export const subdomainOrigin = (
  subdomain: string,
  appDomain: string,
  protocol: string,
) => `${protocol.replace(/:?$/, ':')}//${subdomain}.${appDomain}`

export const apexOrigin = (appDomain: string, protocol: string) =>
  `${protocol.replace(/:?$/, ':')}//${appDomain}`
