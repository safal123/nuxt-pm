import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
  return new PrismaClient()
}

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton> | undefined
  prismaClientVersion: number | undefined
} & typeof global

// Bump when models are added so a stale HMR client is not reused.
const PRISMA_CLIENT_VERSION = 7

const prisma =
  globalThis.prismaClientVersion === PRISMA_CLIENT_VERSION && globalThis.prismaGlobal
    ? globalThis.prismaGlobal
    : prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = prisma
  globalThis.prismaClientVersion = PRISMA_CLIENT_VERSION
}
