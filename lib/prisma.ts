import { PrismaClient } from '@prisma/client'

const databaseUrl = () => {
  const fromEnv = process.env.DATABASE_URL || process.env.NUXT_DATABASE_URL
  if (fromEnv) return fromEnv
  try {
    const url = useRuntimeConfig().databaseUrl
    if (typeof url === 'string' && url) return url
  } catch {
    // Seed scripts and other non-Nuxt callers only have process.env.
  }
  return undefined
}

const prismaClientSingleton = () => {
  const url = databaseUrl()
  return new PrismaClient(url ? { datasourceUrl: url } : undefined)
}

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton> | undefined
  prismaClientVersion: number | undefined
  prismaDatabaseUrl: string | undefined
} & typeof global

// Bump when models are added so a stale HMR client is not reused.
const PRISMA_CLIENT_VERSION = 19

const currentUrl = databaseUrl()
const prisma =
  globalThis.prismaClientVersion === PRISMA_CLIENT_VERSION &&
  globalThis.prismaDatabaseUrl === currentUrl &&
  globalThis.prismaGlobal
    ? globalThis.prismaGlobal
    : prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = prisma
  globalThis.prismaClientVersion = PRISMA_CLIENT_VERSION
  globalThis.prismaDatabaseUrl = currentUrl
}
