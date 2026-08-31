<script setup lang="ts">
const route = useRoute()
const token = computed(() => String(route.params.token || ''))
const { isSignedIn } = useAuth()
const userStore = useUserStore()
const workspaceStore = useWorkspaceStore()

const loading = ref(true)
const joining = ref(false)
const errorMessage = ref('')
const invite = ref<{
  workspaceName: string
  email: string | null
  expiresAt: string
  valid: boolean
  expired: boolean
  used: boolean
} | null>(null)

const redirectPath = computed(() => `/invite/${token.value}`)
const signInUrl = computed(
  () => `/sign-in?redirect_url=${encodeURIComponent(redirectPath.value)}`,
)
const signUpUrl = computed(
  () => `/sign-up?redirect_url=${encodeURIComponent(redirectPath.value)}`,
)

const loadInvite = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    const result = await $fetch<{
      data: {
        workspaceName: string
        email: string | null
        expiresAt: string
        valid: boolean
        expired: boolean
        used: boolean
      }
    }>(`/api/invites/${token.value}`)
    invite.value = result.data
  } catch (error: any) {
    invite.value = null
    errorMessage.value = error?.data?.message || 'This invite is not valid.'
  } finally {
    loading.value = false
  }
}

watch(token, loadInvite, { immediate: true })

const join = async () => {
  joining.value = true
  errorMessage.value = ''
  try {
    await $fetch(`/api/invites/${token.value}/accept`, { method: 'POST' })
    await userStore.me()
    await workspaceStore.fetchWorkspaces()
    await navigateTo('/dashboard')
  } catch (error: any) {
    errorMessage.value = error?.data?.message || 'Could not join this workspace.'
  } finally {
    joining.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-background px-4">
    <div class="absolute top-4 right-4">
      <ThemeToggle />
    </div>
    <div class="w-full max-w-md rounded-xl border bg-card p-8 shadow-sm">
      <p class="text-xs font-semibold uppercase tracking-wide text-violet-600 dark:text-violet-400">Workspace invite</p>

      <div v-if="loading" class="py-10 text-center text-sm text-muted-foreground">Loading invite…</div>

      <template v-else-if="invite?.valid">
        <h1 class="mt-2 text-2xl font-semibold text-foreground">
          Join {{ invite.workspaceName }}
        </h1>
        <p class="mt-2 text-sm text-muted-foreground">
          You’ve been invited to collaborate in this workspace.
        </p>
        <p v-if="invite.email" class="mt-1 text-sm text-muted-foreground">
          This invite is for <span class="font-medium text-foreground">{{ invite.email }}</span>.
        </p>

        <div v-if="isSignedIn" class="mt-6">
          <Button class="w-full" :disabled="joining" @click="join">
            {{ joining ? 'Joining…' : 'Join workspace' }}
          </Button>
        </div>
        <div v-else class="mt-6 flex flex-col gap-2">
          <Button class="w-full" as="a" :href="signInUrl">Sign in to join</Button>
          <Button variant="outline" class="w-full" as="a" :href="signUpUrl">
            Create an account
          </Button>
        </div>
      </template>

      <template v-else>
        <h1 class="mt-2 text-2xl font-semibold text-foreground">Invite unavailable</h1>
        <p class="mt-2 text-sm text-muted-foreground">
          {{
            invite?.used
              ? 'This invite has already been used.'
              : invite?.expired
                ? 'This invite has expired.'
                : errorMessage || 'This invite is not valid.'
          }}
        </p>
        <Button class="mt-6" as="a" href="/sign-in">Go to sign in</Button>
      </template>

      <p v-if="errorMessage && invite?.valid" class="mt-3 text-sm text-red-600">
        {{ errorMessage }}
      </p>
    </div>
  </div>
</template>
