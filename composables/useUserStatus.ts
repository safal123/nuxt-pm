import type { User } from '~/types'
import {
  statusAvailabilitySchema,
  statusClearAfterSchema,
} from '~/server/utils/schemas'
import type { z } from 'zod'

export type StatusAvailability = z.infer<typeof statusAvailabilitySchema>
export type StatusClearAfter = z.infer<typeof statusClearAfterSchema>

export type UserStatus = NonNullable<User['status']>

export const STATUS_PRESETS = [
  { emoji: '📅', label: 'In a meeting' },
  { emoji: '🚗', label: 'Commuting' },
  { emoji: '🤒', label: 'Sick' },
  { emoji: '🌴', label: 'Vacationing' },
  { emoji: '🏠', label: 'Working remotely' },
  { emoji: '💻', label: 'Deep work' },
  { emoji: '☕️', label: 'On a break' },
  { emoji: '🎯', label: 'Focusing' },
] as const

export const defaultUserStatus = (): UserStatus => ({
  availability: 'online',
  emoji: '',
  text: '',
  clearAfter: 'never',
  expiresAt: null,
})

export const useUserStatus = () => {
  const userStore = useUserStore()

  const status = computed(() => userStore.user?.status ?? defaultUserStatus())

  const statusLabel = computed(() => {
    const text = status.value.text.trim()
    if (text) return text
    if (status.value.availability === 'offline') return 'Appear offline'
    return 'Online'
  })

  const statusEmoji = computed(() => {
    if (status.value.emoji) return status.value.emoji
    if (status.value.text.trim()) return '💬'
    return ''
  })

  const saveStatus = async (input: {
    availability: StatusAvailability
    emoji: string
    text: string
    clearAfter: StatusClearAfter
  }) => {
    return userStore.updateStatus(input)
  }

  const clearStatus = async () => {
    return userStore.clearStatus()
  }

  return { status, statusLabel, statusEmoji, saveStatus, clearStatus }
}
