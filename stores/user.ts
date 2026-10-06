import { defineStore } from 'pinia'
import type { User } from '~/types'
import { api } from '~/lib/api'

export const useUserStore = defineStore('user', () => {
  const user = ref<User | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const me = async () => {
    loading.value = true
    error.value = null
    try {
      const { user: next } = await api<{ user: User }>('/api/users')
      user.value = next
      void syncTimezone()
      return next
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch user data'
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateUser = async (newData: Partial<User>) => {
    loading.value = true
    error.value = null
    try {
      const { user: next } = await api<{ user: User }>('/api/users', {
        method: 'PUT',
        body: newData,
      })
      user.value = { ...user.value, ...next }
      return next
    } catch (err: any) {
      error.value = err.message || 'Failed to update user'
      throw err
    } finally {
      loading.value = false
    }
  }

  /** Reminder emails go out at 9am local time, so keep the browser's zone on file. */
  const syncTimezone = async () => {
    if (!import.meta.client || !user.value) return
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (!timezone || user.value.timezone === timezone) return
    try {
      const { user: next } = await api<{ user: User }>('/api/users', {
        method: 'PUT',
        body: { timezone },
      })
      user.value = { ...user.value, ...next }
    } catch {
      // Non-blocking: reminders fall back to UTC until the next visit.
    }
  }

  const updateSubdomain = async (subdomain: string) => {
    const { user: next } = await api<{ user: User }>('/api/users/subdomain', {
      method: 'PUT',
      body: { subdomain },
    })
    user.value = { ...user.value, ...next }
    // The auth middleware reads the session's subdomain to pick the host.
    await useAuth().fetchSession()
    return next
  }

  const updateStatus = async (payload: {
    availability: NonNullable<User['status']>['availability']
    emoji: string
    text: string
    clearAfter: NonNullable<User['status']>['clearAfter']
  }) => {
    const { user: next } = await api<{ user: User }>('/api/users/status', {
      method: 'PATCH',
      body: payload,
    })
    if (user.value) user.value = { ...user.value, ...next }
    return next
  }

  const clearStatus = async () => {
    return updateStatus({
      availability: 'online',
      emoji: '',
      text: '',
      clearAfter: 'never',
    })
  }

  const clearUser = () => {
    user.value = null
    error.value = null
  }

  return {
    user,
    loading,
    error,
    me,
    updateUser,
    updateSubdomain,
    updateStatus,
    clearStatus,
    clearUser,
  }
})
