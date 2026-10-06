import prisma from '~/lib/prisma'
import type { z } from 'zod'
import type {
  statusAvailabilitySchema,
  statusClearAfterSchema,
  userStatusSchema,
} from '~/server/utils/schemas'

type StatusAvailability = z.infer<typeof statusAvailabilitySchema>
type StatusClearAfter = z.infer<typeof statusClearAfterSchema>
type UserStatusInput = z.infer<typeof userStatusSchema>

const AVAILABILITY = ['online', 'offline'] as const
const CLEAR_AFTER = ['never', '30m', '1h', '4h', 'today', 'week'] as const

const asAvailability = (value: string | null | undefined): StatusAvailability =>
  AVAILABILITY.includes(value as StatusAvailability) ? (value as StatusAvailability) : 'online'

const asClearAfter = (value: string | null | undefined): StatusClearAfter =>
  CLEAR_AFTER.includes(value as StatusClearAfter) ? (value as StatusClearAfter) : 'never'

export const statusExpiresAt = (clearAfter: StatusClearAfter) => {
  const now = Date.now()
  if (clearAfter === '30m') return new Date(now + 30 * 60 * 1000)
  if (clearAfter === '1h') return new Date(now + 60 * 60 * 1000)
  if (clearAfter === '4h') return new Date(now + 4 * 60 * 60 * 1000)
  if (clearAfter === 'today') {
    const end = new Date()
    end.setHours(23, 59, 59, 999)
    return end
  }
  if (clearAfter === 'week') {
    const end = new Date()
    const day = end.getDay()
    const days = day === 0 ? 0 : 7 - day
    end.setDate(end.getDate() + days)
    end.setHours(23, 59, 59, 999)
    return end
  }
  return null
}

export const serializeUserStatus = (row?: {
  availability: string
  emoji: string | null
  text: string | null
  clearAfter: string
  expiresAt: Date | null
} | null) => {
  if (!row) {
    return {
      availability: 'online' as const,
      emoji: '',
      text: '',
      clearAfter: 'never' as const,
      expiresAt: null as string | null,
    }
  }
  return {
    availability: asAvailability(row.availability),
    emoji: row.emoji ?? '',
    text: row.text ?? '',
    clearAfter: asClearAfter(row.clearAfter),
    expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
  }
}

const emptyStatus = () =>
  serializeUserStatus({
    availability: 'online',
    emoji: null,
    text: null,
    clearAfter: 'never',
    expiresAt: null,
  })

export const resolveUserStatus = async (userId: string) => {
  const row = await prisma.userStatus.findUnique({ where: { userId } })
  if (!row) return emptyStatus()
  if (row.expiresAt && row.expiresAt.getTime() <= Date.now()) {
    await prisma.userStatus.update({
      where: { userId },
      data: {
        availability: 'online',
        emoji: null,
        text: null,
        clearAfter: 'never',
        expiresAt: null,
      },
    })
    return emptyStatus()
  }
  return serializeUserStatus(row)
}

export const updateUserStatus = async (userId: string, input: UserStatusInput) => {
  const emoji = input.emoji
  const text = input.text
  const availability = input.availability
  const clearAfter = input.clearAfter
  const hasPresence = Boolean(text || emoji || availability === 'offline')
  const expiresAt = hasPresence ? statusExpiresAt(clearAfter) : null

  const row = await prisma.userStatus.upsert({
    where: { userId },
    create: {
      user: { connect: { id: userId } },
      availability,
      emoji,
      text,
      clearAfter,
      expiresAt,
    },
    update: {
      availability,
      emoji,
      text,
      clearAfter,
      expiresAt,
    },
  })
  return serializeUserStatus(row)
}

export const clearUserStatus = async (userId: string) => {
  return updateUserStatus(userId, {
    availability: 'online',
    emoji: null,
    text: null,
    clearAfter: 'never',
  })
}
