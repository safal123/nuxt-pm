const PROTECTED_PREFIXES = ['/w', '/profile']
const AUTH_PAGES = ['/sign-in', '/sign-up']

export default defineNuxtRouteMiddleware((to) => {
  const { isSignedIn } = useAuth()
  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    to.path.startsWith(prefix),
  )

  if (!isSignedIn.value && isProtected) {
    return navigateTo({
      path: '/sign-in',
      query: { redirect_url: to.fullPath },
    })
  }

  if (isSignedIn.value && AUTH_PAGES.includes(to.path)) {
    const dest =
      typeof to.query.redirect_url === 'string' ? to.query.redirect_url : '/w'
    return navigateTo(dest)
  }
})
