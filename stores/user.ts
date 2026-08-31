import { defineStore } from 'pinia'
import type { User } from '~/types'

interface UserResponse {
  data: { user: User | null }
  message?: string
}

export const useUserStore = defineStore('user', () => {
  const user = ref<User | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const me = async () => {
    loading.value = true
    error.value = null
    try {
      const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
      const { data } = await useFetch<UserResponse>('/api/users', { headers })
      if (data.value?.data.user) {
        user.value = data.value.data.user
      }
      return data.value?.data.user
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch user data'
      console.error('Error fetching user:', err)
      return null
    } finally {
      loading.value = false
    }
  }

  const updateUser = async (newData: Partial<User>) => {
    loading.value = true
    error.value = null
    try {
      const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
      const result = await $fetch<UserResponse>('/api/users', {
        method: 'PUT',
        body: newData,
        headers
      })
      if (result?.data.user) {
        user.value = result.data.user
      }
      return result?.data.user
    } catch (err: any) {
      error.value = err.message || 'Failed to update user'
      console.error('Error updating user:', err)
      return null
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

    // Actions
    me,
    updateUser,
    clearUser
  }
})