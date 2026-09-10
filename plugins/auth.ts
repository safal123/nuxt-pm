/**
 * Loads the session before the app renders so every component can read
 * `useAuth().isSignedIn` synchronously. Runs on the server, then the result
 * travels to the client in the Nuxt payload.
 */
export default defineNuxtPlugin(async () => {
  const { session, fetchSession } = useAuth()
  if (!session.value) await fetchSession()
})
