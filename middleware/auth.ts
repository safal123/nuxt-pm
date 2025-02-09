export default defineNuxtRouteMiddleware((to, from) => {
  const { userId } = useAuth()

  // If the user is not signed in, redirect to the sign-in page
  if (!userId.value) {
    return navigateTo('/sign-in')
  }
})
