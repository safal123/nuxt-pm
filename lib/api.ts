import { getRequestHeader } from 'h3'

type ApiMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

/**
 * Single client entry for app APIs. Forwards cookies during SSR and unwraps
 * the `{ data, message }` envelope so callers receive `data` only.
 *
 * Auth/session still uses `authClient` / `useAuth` — those talk to Better Auth
 * directly and do not use this wrapper.
 */
const ssrCookieHeader = () => {
  if (!import.meta.server) return undefined
  // tryUseNuxtApp does not throw when Pinia calls this after an await.
  const event = tryUseNuxtApp()?.ssrContext?.event
  if (!event) return undefined
  const cookie = getRequestHeader(event, 'cookie')
  return cookie ? { cookie } : undefined
}

export async function api<T>(
  path: string,
  opts?: {
    method?: ApiMethod
    body?: unknown
    query?: Record<string, unknown>
  },
): Promise<T> {
  const result = await $fetch<{ data: T; message: string }>(path, {
    method: opts?.method,
    body: opts?.body as Record<string, unknown> | undefined,
    query: opts?.query,
    headers: ssrCookieHeader(),
  })

  return result.data
}
