/**
 * API-facing people. Prisma stores `image`; responses expose `imageUrl`.
 * Keep serializers here — do not re-export from other utils (Nuxt auto-import).
 */
export const personSelect = {
  id: true,
  name: true,
  email: true,
  image: true,
} as const

export type PersonRow = {
  id: string
  name: string | null
  email: string
  image?: string | null
}

export const serializePerson = (user: PersonRow) => ({
  id: user.id,
  name: user.name ?? null,
  email: user.email,
  imageUrl: user.image ?? null,
})

export const serializeMember = (
  user: PersonRow,
  extras?: { role?: string; isOwner?: boolean },
) => ({
  ...serializePerson(user),
  role: extras?.role,
  isOwner: extras?.isOwner ?? extras?.role === 'OWNER',
})

/** GET/PUT /api/users — never a raw Prisma row. */
export const serializeAppUser = (user: {
  id: string
  email: string
  emailVerified: boolean
  name: string | null
  image: string | null
  activeWorkspaceId: string | null
  activeProjectId: string | null
}) => ({
  id: user.id,
  email: user.email,
  emailVerified: user.emailVerified,
  name: user.name ?? null,
  image: user.image ?? null,
  imageUrl: user.image ?? null,
  activeWorkspaceId: user.activeWorkspaceId,
  activeProjectId: user.activeProjectId,
})
