/**
 * Proves Postgres row-level security isolates workspaces, even for queries
 * with no `where`. Creates two throwaway users with a workspace/project/task
 * each, checks every read/write path, then deletes them.
 *
 *   npx tsx --env-file=.env scripts/verify-tenant-isolation.ts
 */
import prisma, { systemPrisma } from '../lib/prisma'
import { runAsTenant } from '../lib/tenant-context'

const stamp = Date.now().toString(36)
let failures = 0

const check = (label: string, ok: boolean) => {
  if (!ok) failures++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`)
}

const rejects = async (fn: () => Promise<unknown>) => {
  try {
    await fn()
    return false
  } catch {
    return true
  }
}

const seedTenant = async (name: string) => {
  const user = await systemPrisma.user.create({
    data: { email: `rls-${name}-${stamp}@example.com`, name, subdomain: `rls-${name}-${stamp}` },
  })
  const workspace = await systemPrisma.workspace.create({
    data: {
      name: `${name} workspace`,
      createdBy: user.id,
      members: { create: { userId: user.id, role: 'OWNER' } },
    },
  })
  const project = await systemPrisma.project.create({
    data: { name: `${name} project`, workspaceId: workspace.id, createdBy: user.id },
  })
  const column = await systemPrisma.taskColumn.create({
    data: { name: 'Todo', projectId: project.id, workspaceId: workspace.id },
  })
  const task = await systemPrisma.task.create({
    data: {
      title: `${name} secret task`,
      columnId: column.id,
      projectId: project.id,
      workspaceId: workspace.id,
      createdBy: user.id,
    },
  })
  return { user, workspace, project, column, task }
}

const main = async () => {
  const alice = await seedTenant('alice')
  const bob = await seedTenant('bob')

  try {
    await runAsTenant(alice.user.id, async () => {
      const workspaces = await prisma.workspace.findMany()
      check('unfiltered workspace.findMany returns only own workspaces',
        workspaces.every((w) => w.id !== bob.workspace.id) &&
        workspaces.some((w) => w.id === alice.workspace.id))

      const tasks = await prisma.task.findMany({ select: { id: true } })
      check('unfiltered task.findMany hides other tenant tasks',
        !tasks.some((t) => t.id === bob.task.id) && tasks.some((t) => t.id === alice.task.id))

      check('findUnique by id on other tenant task returns null',
        (await prisma.task.findUnique({ where: { id: bob.task.id } })) === null)

      const viaInclude = await prisma.project.findMany({ include: { tasks: true } })
      check('include does not leak other tenant rows',
        viaInclude.every((p) => p.workspaceId !== bob.workspace.id))

      check('update of other tenant task is rejected',
        await rejects(() => prisma.task.update({ where: { id: bob.task.id }, data: { title: 'pwned' } })))

      const deleted = await prisma.task.deleteMany({ where: { id: bob.task.id } })
      check('deleteMany on other tenant task affects 0 rows', deleted.count === 0)

      check('insert into other tenant workspace is rejected',
        await rejects(() => prisma.project.create({
          data: { name: `intrusion-${stamp}`, workspaceId: bob.workspace.id, createdBy: alice.user.id },
        })))

      const [count, own] = await prisma.$transaction([
        prisma.task.count(),
        prisma.task.findUnique({ where: { id: alice.task.id } }),
      ])
      check('batch $transaction is scoped', own?.id === alice.task.id &&
        count === tasks.length)

      const fromInteractive = await prisma.$transaction(async (tx) =>
        tx.task.findMany({ where: { id: { in: [alice.task.id, bob.task.id] } } }))
      check('interactive $transaction is scoped',
        fromInteractive.length === 1 && fromInteractive[0]!.id === alice.task.id)

      const created = await prisma.workspace.create({
        data: {
          name: `alice second ${stamp}`,
          createdBy: alice.user.id,
          members: { create: { userId: alice.user.id, role: 'OWNER' } },
          settings: { create: {} },
        },
      })
      check('creating an own workspace with nested rows works', Boolean(created.id))

      check('cannot create a workspace on behalf of another user',
        await rejects(() => prisma.workspace.create({
          data: { name: `forged ${stamp}`, createdBy: bob.user.id },
        })))
    })

    const untouched = await systemPrisma.task.findUnique({ where: { id: bob.task.id } })
    check('other tenant data is unchanged', untouched?.title === 'bob secret task')
  } finally {
    for (const tenant of [alice, bob]) {
      await systemPrisma.user.update({
        where: { id: tenant.user.id },
        data: { activeWorkspaceId: null, activeProjectId: null },
      })
      await systemPrisma.workspace.deleteMany({ where: { createdBy: tenant.user.id } })
      await systemPrisma.user.delete({ where: { id: tenant.user.id } })
    }
    await systemPrisma.$disconnect()
  }

  console.log(failures ? `\n${failures} check(s) failed` : '\nAll isolation checks passed')
  process.exit(failures ? 1 : 0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
