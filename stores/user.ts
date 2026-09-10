import { defineStore } from 'pinia'
import type { User } from '~/types'
import { api } from '~/lib/api'
import { CACHE_TTL, isFresh, type FetchOptions } from '~/lib/query'

export const useUserStore = defineStore('user', () => {
  const user = ref<User | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const fetchedAt = ref<number | null>(null)
  let inflight: Promise<User | null> | null = null

  const me = async (options?: FetchOptions) => {
    if (!options?.force && user.value && isFresh(fetchedAt.value, CACHE_TTL.user)) {
      return user.value
    }
    if (inflight && !options?.force) return inflight

    inflight = (async () => {
      loading.value = true
      error.value = null
      try {
        const { user: next } = await api<{ user: User }>('/api/users')
        user.value = next
        fetchedAt.value = Date.now()
        return next
      } catch (err: any) {
        error.value = err.message || 'Failed to fetch user data'
        throw err
      } finally {
        loading.value = false
        inflight = null
      }
    })()

    return inflight
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
      fetchedAt.value = Date.now()
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
    fetchedAt.value = null
    inflight = null
    useWorkspaceStore().reset()
    useBoardStore().reset()
    if (import.meta.client) clearNuxtData()
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
