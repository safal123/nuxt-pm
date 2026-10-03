const PROTECTED_PREFIXES = ['/w', '/profile']
const AUTH_PAGES = ['/sign-in', '/sign-up']

export default defineNuxtRouteMiddleware((to) => {
  const { isSignedIn, user } = useAuth()
  const userStore = useUserStore()
  const { enabled, currentSubdomain, subdomainUrl, apexUrl, goToSubdomain } = useSubdomain()
  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    to.path.startsWith(prefix),
  )
  const isAuthPage = AUTH_PAGES.includes(to.path)
  const homeSubdomain = user.value?.subdomain || userStore.user?.subdomain || null
  const toApex = (path: string) =>
    navigateTo(apexUrl(path), { external: true, redirectCode: 302 })

  if (isSignedIn.value && isAuthPage) {
    const dest =
      typeof to.query.redirect_url === 'string' ? to.query.redirect_url : '/w'
    return goToSubdomain(homeSubdomain, dest)
  }

  // Sign-in / sign-up live on the apex only.
  if (currentSubdomain && isAuthPage) {
    return toApex(to.fullPath)
  }

  if (!isSignedIn.value && isProtected) {
    const signIn = `/sign-in?redirect_url=${encodeURIComponent(to.fullPath)}`
    return currentSubdomain ? toApex(signIn) : navigateTo(signIn)
  }

  // A user subdomain has no marketing page of its own.
  if (currentSubdomain && to.path === '/') {
    return isSignedIn.value ? navigateTo('/w', { replace: true }) : toApex('/')
  }

  if (
    enabled &&
    isSignedIn.value &&
    isProtected &&
    homeSubdomain &&
    currentSubdomain !== homeSubdomain
  ) {
    return navigateTo(subdomainUrl(homeSubdomain, to.fullPath), {
      external: true,
      redirectCode: 302,
    })
  }
})
