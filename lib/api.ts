type ApiMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

/**
 * Single client entry for app APIs. Forwards cookies during SSR and unwraps
 * the `{ data, message }` envelope so callers receive `data` only.
 *
 * Auth/session still uses `authClient` / `useAuth` — those talk to Better Auth
 * directly and do not use this wrapper.
 */
export async function api<T>(
  path: string,
  opts?: {
    method?: ApiMethod
    body?: unknown
    query?: Record<string, unknown>
  },
): Promise<T> {
  const headers = import.meta.server
    ? useRequestHeaders(['cookie'])
    : undefined

  const result = await $fetch<{ data: T; message: string }>(path, {
    method: opts?.method,
    body: opts?.body as Record<string, unknown> | undefined,
    query: opts?.query,
    headers,
  })

  return result.data
}
