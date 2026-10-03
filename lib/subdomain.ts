// Relative, not aliased: `lib/auth.ts` imports this and the `auth` CLI loads it outside Nuxt.
import { systemPrisma as prisma } from './prisma'
import { SUBDOMAIN_MAX_LENGTH, slugifySubdomain } from '../utils/subdomain'

export const isSubdomainTaken = async (subdomain: string, exceptUserId?: string) => {
  const owner = await prisma.user.findUnique({
    where: { subdomain },
    select: { id: true },
  })
  return Boolean(owner && owner.id !== exceptUserId)
}

/** First free label derived from `seed`: `john`, `john-2`, … then a random suffix. */
export const generateSubdomain = async (seed: string) => {
  const base = slugifySubdomain(seed)
  for (let n = 1; n <= 20; n++) {
    const suffix = n === 1 ? '' : `-${n}`
    const candidate = `${base.slice(0, SUBDOMAIN_MAX_LENGTH - suffix.length)}${suffix}`
    if (!(await isSubdomainTaken(candidate))) return candidate
  }
  const random = `-${Math.random().toString(36).slice(2, 8)}`
  return `${base.slice(0, SUBDOMAIN_MAX_LENGTH - random.length)}${random}`
}
