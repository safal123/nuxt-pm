const KEY = 'nuxt-color-mode'
const ONE_YEAR = 60 * 60 * 24 * 365

/**
 * @nuxtjs/color-mode writes its cookie without a path, so every directory the
 * theme is changed from gets its own copy and a stale one wins after refresh.
 * Keep a single root cookie and expire the scoped copies.
 */
const clearScopedCookies = () => {
  const segments = location.pathname.split('/').filter(Boolean)
  for (let index = segments.length; index > 0; index--) {
    const path = `/${segments.slice(0, index).join('/')}`
    document.cookie = `${KEY}=; path=${path}; max-age=0`
    document.cookie = `${KEY}=; path=${path}/; max-age=0`
  }
}

export default defineNuxtPlugin(() => {
  const colorMode = useColorMode()

  // Runs after the module's own watcher, so its path-less write is undone.
  watch(
    () => colorMode.preference,
    (preference) => {
      if (!preference) return
      clearScopedCookies()
      document.cookie = `${KEY}=${preference}; path=/; max-age=${ONE_YEAR}; samesite=lax`
    },
    { immediate: true },
  )
})
