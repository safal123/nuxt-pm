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
      user.value = next
      return next
    } catch (err: any) {
      error.value = err.message || 'Failed to update user'
      throw err
    } finally {
      loading.value = false
    }
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
    clearUser,
  }
})
