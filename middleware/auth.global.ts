const isProtectedRoute = createRouteMatcher(['/dashboard(.*)'])

export default defineNuxtRouteMiddleware((to) => {
  const { userId } = useAuth()

  if (!userId.value && isProtectedRoute(to)) {
    console.log('redirecting to sign-in')
    return navigateTo('/sign-in')
  }
})