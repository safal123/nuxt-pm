import type { User } from '~/types'

interface SessionPayload {
  user: User | null
}

/**
 * Single source of truth for the signed-in session.
 *
 * The session is fetched once during SSR by `plugins/auth.ts` and handed to the
 * client through the Nuxt payload, so `isSignedIn` is readable synchronously in
 * any component without a loading flash or a hydration mismatch.
 */
export const useAuth = () => {
  const session = useState<SessionPayload | null>('auth-session', () => null)

  const fetchSession = async () => {
    const headers = import.meta.server
      ? useRequestHeaders(['cookie'])
      : undefined

    session.value = await $fetch<SessionPayload | null>(
      '/api/auth/get-session',
      { headers },
    ).catch(() => null)

    return session.value
  }

  const clearSession = () => {
    session.value = null
  }

  return {
    session,
    fetchSession,
    clearSession,
    user: computed(() => session.value?.user ?? null),
    userId: computed(() => session.value?.user?.id ?? null),
    isSignedIn: computed(() => Boolean(session.value?.user)),
  }
}
