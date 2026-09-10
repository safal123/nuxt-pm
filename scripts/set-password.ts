/**
 * Sets an email/password credential on an existing user.
 *
 * Accounts carried over from Clerk have a `users` row but no Better Auth
 * credential, so they can neither sign in nor sign up again (the email is
 * taken). This grants them a password once; change it afterwards from
 * Manage account.
 *
 *   npx tsx --env-file=.env scripts/set-password.ts you@example.com 'secret123'
 */
import { auth } from '../lib/auth'
import prisma from '../lib/prisma'

const [email, password] = process.argv.slice(2)

const main = async () => {
  if (!email || !password) {
    console.error(
      'Usage: npx tsx --env-file=.env scripts/set-password.ts <email> <password>',
    )
    process.exit(1)
  }

  if (password.length < 8) {
    console.error('Password must be at least 8 characters.')
    process.exit(1)
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    console.error(`No user found with email ${email}`)
    process.exit(1)
  }

  const { password: hasher } = await auth.$context
  const hash = await hasher.hash(password)

  const existing = await prisma.account.findFirst({
    where: { userId: user.id, providerId: 'credential' },
    select: { id: true },
  })

  if (existing) {
    await prisma.account.update({
      where: { id: existing.id },
      data: { password: hash },
    })
    console.log(`Updated password for ${email}`)
  } else {
    await prisma.account.create({
      data: {
        id: crypto.randomUUID(),
        accountId: user.id,
        providerId: 'credential',
        userId: user.id,
        password: hash,
      },
    })
    console.log(`Added password credential for ${email}`)
  }

  await prisma.$disconnect()
}

main().catch(async (error) => {
  console.error(error?.message ?? error)
  await prisma.$disconnect()
  process.exit(1)
})
