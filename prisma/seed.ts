/**
 * Demo seeder for the kanban app.
 *
 * Rebuilds a realistic company: teammates, workspaces, colored lists,
 * cards with dates / labels / covers / comments / likes / activity.
 * Any signed-in Clerk user is attached as an owner so the dashboard
 * shows this data immediately.
 *
 *   npm run db:seed
 *
 * Safe to re-run: previous seed rows are removed first. Real users
 * and workspaces they created themselves are left alone.
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const SEED_TAG = '[seed]'
const SEED_CLERK = 'seed_'

type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
type Status = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED'
type PersonKey =
  | 'maya'
  | 'jordan'
  | 'priya'
  | 'leo'
  | 'hana'
  | 'owen'
  | 'sofia'
  | 'kai'

const COLORS = {
  green: '#61bd4f',
  yellow: '#f2d600',
  orange: '#ff9f1a',
  red: '#eb5a46',
  purple: '#c377e0',
  blue: '#0079bf',
  sky: '#00c2e0',
  lime: '#51e898',
  pink: '#ff78cb',
  black: '#344563',
} as const

const TEAM: Record<
  PersonKey,
  { name: string; email: string; title: string }
> = {
  maya: { name: 'Maya Chen', email: 'maya.chen@northstar.demo', title: 'Head of Product' },
  jordan: { name: 'Jordan Hale', email: 'jordan.hale@northstar.demo', title: 'Engineering lead' },
  priya: { name: 'Priya Nair', email: 'priya.nair@northstar.demo', title: 'Designer' },
  leo: { name: 'Leo Martins', email: 'leo.martins@northstar.demo', title: 'iOS engineer' },
  hana: { name: 'Hana Sato', email: 'hana.sato@northstar.demo', title: 'Android engineer' },
  owen: { name: 'Owen Blake', email: 'owen.blake@northstar.demo', title: 'QA' },
  sofia: { name: 'Sofia Alvarez', email: 'sofia.alvarez@northstar.demo', title: 'Marketing' },
  kai: { name: 'Kai Okonkwo', email: 'kai.okonkwo@northstar.demo', title: 'Support lead' },
}

const PERSON_KEYS = Object.keys(TEAM) as PersonKey[]

interface TaskDraft {
  title: string
  description?: string
  priority?: Priority
  status?: Status
  cover?: keyof typeof COLORS
  labels?: string[]
  assignee?: PersonKey
  members?: PersonKey[]
  due?: number
  start?: number
  end?: number
  comments?: { by: PersonKey; text: string; hoursAgo: number }[]
  likes?: PersonKey[]
  files?: { name: string; mime: string; size: number }[]
}

interface ColumnDraft {
  name: string
  color?: keyof typeof COLORS
  archived?: boolean
  status: Status
  tasks: TaskDraft[]
}

interface ProjectDraft {
  name: string
  description: string
  labels: { name: string; color: keyof typeof COLORS }[]
  columns: ColumnDraft[]
}

interface WorkspaceDraft {
  name: string
  description: string
  projects: ProjectDraft[]
}

const WORKSPACES: WorkspaceDraft[] = [
  {
    name: 'Northstar',
    description: `${SEED_TAG} Consumer product team shipping the Northstar mobile app.`,
    projects: [
      {
        name: 'Mobile App Launch',
        description: 'iOS + Android 1.0 — onboarding, home feed, and notifications.',
        labels: [
          { name: 'Feature', color: 'blue' },
          { name: 'Bug', color: 'red' },
          { name: 'Design', color: 'purple' },
          { name: 'iOS', color: 'sky' },
          { name: 'Android', color: 'lime' },
          { name: 'Research', color: 'orange' },
          { name: 'Blocked', color: 'black' },
        ],
        columns: [
          {
            name: 'Backlog',
            color: 'black',
            status: 'TODO',
            tasks: [
              {
                title: 'Offline cache for the home feed',
                description: 'Keep the last 50 posts readable when the device has no network. Invalidate on pull-to-refresh.',
                priority: 'MEDIUM',
                labels: ['Feature', 'Android', 'iOS'],
                assignee: 'jordan',
                members: ['jordan', 'leo', 'hana'],
              },
              {
                title: 'Widget for daily streak',
                description: 'Home-screen widget that shows the current streak and a one-tap check-in.',
                priority: 'LOW',
                labels: ['Feature', 'iOS'],
                assignee: 'leo',
                members: ['leo', 'priya'],
              },
              {
                title: 'Accessibility pass on auth screens',
                description: 'VoiceOver labels, Dynamic Type, and contrast on sign-in / sign-up.',
                priority: 'HIGH',
                labels: ['Design'],
                assignee: 'priya',
                members: ['priya', 'owen'],
              },
              {
                title: 'Experiment: delayed onboarding quiz',
                description: 'Move the 6-question quiz behind the first successful session and measure activation.',
                priority: 'LOW',
                labels: ['Research', 'Feature'],
                assignee: 'maya',
                members: ['maya', 'sofia'],
              },
            ],
          },
          {
            name: 'To Do',
            color: 'blue',
            status: 'TODO',
            tasks: [
              {
                title: 'Push notification permission timing',
                description: 'Ask after the user completes their first saved item, not on cold start.',
                priority: 'HIGH',
                cover: 'blue',
                labels: ['Feature'],
                assignee: 'maya',
                members: ['maya', 'jordan', 'sofia'],
                due: 4,
                start: -1,
                comments: [
                  { by: 'sofia', text: 'Growth wants this behind a feature flag so we can A/B the copy.', hoursAgo: 30 },
                  { by: 'jordan', text: 'Flag is `notif_soft_ask`. I will wire it tomorrow.', hoursAgo: 18 },
                ],
                likes: ['maya', 'sofia'],
              },
              {
                title: 'Empty state for a brand-new account',
                description: 'Illustration + 3 starter actions. Should feel like a first win, not a vacant board.',
                priority: 'MEDIUM',
                cover: 'purple',
                labels: ['Design', 'Feature'],
                assignee: 'priya',
                members: ['priya', 'maya'],
                due: 6,
                files: [{ name: 'empty-state-v3.fig', mime: 'application/octet-stream', size: 842_112 }],
              },
              {
                title: 'Rate-limit the comment endpoint',
                description: '10 comments / minute per user. Return a friendly 429 toast.',
                priority: 'MEDIUM',
                labels: ['Feature'],
                assignee: 'jordan',
                members: ['jordan'],
                due: 8,
              },
              {
                title: 'Deep link from marketing emails',
                description: 'northstar://item/{id} should open the item modal after auth.',
                priority: 'HIGH',
                labels: ['iOS', 'Android', 'Feature'],
                assignee: 'hana',
                members: ['hana', 'leo', 'sofia'],
                due: 3,
              },
            ],
          },
          {
            name: 'In Progress',
            color: 'sky',
            status: 'IN_PROGRESS',
            tasks: [
              {
                title: 'Onboarding carousel rewrite',
                description: 'Replace the 5-slide marketing carousel with a 3-step interactive setup: name, interest tags, first follow.',
                priority: 'URGENT',
                cover: 'orange',
                labels: ['Feature', 'Design'],
                assignee: 'priya',
                members: ['priya', 'leo', 'maya'],
                start: -5,
                due: 2,
                comments: [
                  { by: 'maya', text: 'Let us ship the 3-step flow even if the illustrations are placeholders.', hoursAgo: 8 },
                  { by: 'priya', text: 'Placeholders are in. Motion pass tonight.', hoursAgo: 3 },
                ],
                likes: ['maya', 'jordan', 'leo'],
                files: [{ name: 'onboarding-frames.png', mime: 'image/png', size: 412_880 }],
              },
              {
                title: 'Home feed pagination',
                description: 'Cursor-based pages of 20. Skeleton on first load, inline spinner on next page.',
                priority: 'HIGH',
                cover: 'sky',
                labels: ['Feature', 'Android'],
                assignee: 'hana',
                members: ['hana', 'jordan'],
                start: -3,
                due: 1,
                comments: [
                  { by: 'jordan', text: 'API is live on `/feed?cursor=`. Android can switch off offset today.', hoursAgo: 12 },
                ],
                likes: ['jordan'],
              },
              {
                title: 'Crash on image upload (iOS 17)',
                description: 'PHPicker returns a nil URL when Live Photo is selected. Reproduce on 15 Pro.',
                priority: 'URGENT',
                cover: 'red',
                labels: ['Bug', 'iOS'],
                assignee: 'leo',
                members: ['leo', 'owen'],
                start: -1,
                due: 0,
                comments: [
                  { by: 'owen', text: 'Reproduced on 17.5. Happens only when the Live Photo toggle is on.', hoursAgo: 6 },
                  { by: 'leo', text: 'Fix is on `fix/live-photo-upload`. Review please.', hoursAgo: 1 },
                ],
                likes: ['owen', 'maya'],
              },
            ],
          },
          {
            name: 'In Review',
            color: 'purple',
            status: 'IN_REVIEW',
            tasks: [
              {
                title: 'Dark mode tokens for the tab bar',
                description: 'Map semantic colors so the tab bar is not pure black. Matches the new charcoal theme.',
                priority: 'MEDIUM',
                cover: 'purple',
                labels: ['Design', 'iOS', 'Android'],
                assignee: 'priya',
                members: ['priya', 'leo', 'hana'],
                start: -8,
                end: 1,
                due: 1,
                comments: [
                  { by: 'leo', text: 'iOS looks good. Android still uses the old elevation overlay.', hoursAgo: 20 },
                  { by: 'hana', text: 'Pushed a follow-up. Ready for another look.', hoursAgo: 5 },
                ],
                likes: ['maya', 'leo'],
              },
              {
                title: 'Password reset copy',
                description: 'Shorter subject line, one CTA, and a 15-minute expiry note.',
                priority: 'LOW',
                labels: ['Feature'],
                assignee: 'sofia',
                members: ['sofia', 'kai'],
                due: 2,
              },
            ],
          },
          {
            name: 'Blocked',
            color: 'red',
            status: 'BLOCKED',
            tasks: [
              {
                title: 'App Store review notes',
                description: 'Waiting on the demo account Apple asked for. Legal is reviewing the privacy nutrition labels.',
                priority: 'URGENT',
                cover: 'red',
                labels: ['Blocked', 'iOS'],
                assignee: 'maya',
                members: ['maya', 'jordan', 'kai'],
                due: -1,
                comments: [
                  { by: 'kai', text: 'Demo account is ready: review@northstar.demo / the usual vault password.', hoursAgo: 40 },
                  { by: 'maya', text: 'Legal still has the nutrition labels. I pinged them this morning.', hoursAgo: 4 },
                ],
                likes: ['jordan'],
              },
            ],
          },
          {
            name: 'Done',
            color: 'green',
            status: 'DONE',
            tasks: [
              {
                title: 'Clerk sign-in + sign-up screens',
                description: 'Custom appearance tokens, dark/light, and the post-auth redirect into the dashboard.',
                priority: 'HIGH',
                cover: 'green',
                labels: ['Feature'],
                assignee: 'jordan',
                members: ['jordan', 'maya'],
                start: -21,
                end: -12,
                due: -12,
                comments: [
                  { by: 'maya', text: 'This is the new baseline. Nice work.', hoursAgo: 96 },
                ],
                likes: ['maya', 'priya', 'sofia'],
              },
              {
                title: 'Project-level member invites',
                description: 'Owners can add or remove people from a single board without changing workspace membership.',
                priority: 'MEDIUM',
                labels: ['Feature'],
                assignee: 'jordan',
                members: ['jordan'],
                start: -14,
                end: -6,
                due: -6,
                likes: ['maya'],
              },
              {
                title: 'Kanban column colors + archive',
                description: 'List menu: tint, move left/right, archive. Archived lists stay out of the board.',
                priority: 'MEDIUM',
                cover: 'lime',
                labels: ['Feature', 'Design'],
                assignee: 'priya',
                members: ['priya', 'jordan'],
                start: -10,
                end: -3,
                due: -3,
                likes: ['maya', 'jordan'],
              },
              {
                title: 'Task priority + status selects',
                description: 'shadcn Select on the card modal. Complete checkbox sets status to Done.',
                priority: 'LOW',
                labels: ['Feature'],
                assignee: 'maya',
                members: ['maya'],
                start: -7,
                end: -2,
                due: -2,
              },
            ],
          },
          {
            name: 'Icebox',
            color: 'yellow',
            archived: true,
            status: 'TODO',
            tasks: [
              {
                title: 'Apple Watch glance',
                description: 'Parked until after 1.0. Only a streak count — no comments.',
                priority: 'LOW',
                labels: ['Feature', 'iOS'],
                assignee: 'leo',
                members: ['leo'],
              },
            ],
          },
        ],
      },
      {
        name: 'Marketing Site',
        description: 'Launch landing page, pricing, and the public changelog.',
        labels: [
          { name: 'Copy', color: 'yellow' },
          { name: 'Design', color: 'purple' },
          { name: 'Engineering', color: 'blue' },
          { name: 'SEO', color: 'green' },
        ],
        columns: [
          {
            name: 'Ideas',
            color: 'yellow',
            status: 'TODO',
            tasks: [
              {
                title: 'Customer story: Harbor Coffee',
                description: 'Interview next week. Need 3 quotes and a 16:9 hero.',
                priority: 'MEDIUM',
                labels: ['Copy'],
                assignee: 'sofia',
                members: ['sofia', 'maya'],
              },
              {
                title: 'Changelog RSS',
                description: 'Public feed so folks can subscribe without an account.',
                priority: 'LOW',
                labels: ['Engineering', 'SEO'],
                assignee: 'jordan',
                members: ['jordan'],
              },
            ],
          },
          {
            name: 'Writing',
            color: 'orange',
            status: 'IN_PROGRESS',
            tasks: [
              {
                title: 'Pricing page FAQ',
                description: 'Eight questions. Keep answers under 40 words.',
                priority: 'HIGH',
                cover: 'orange',
                labels: ['Copy'],
                assignee: 'sofia',
                members: ['sofia', 'maya'],
                due: 3,
                comments: [
                  { by: 'maya', text: 'Please mention the 14-day trial in the first answer.', hoursAgo: 14 },
                ],
                likes: ['maya'],
              },
              {
                title: 'Hero headline options',
                description: 'Need 5 variants for the A/B. Tone: calm, not hype.',
                priority: 'HIGH',
                labels: ['Copy', 'Design'],
                assignee: 'sofia',
                members: ['sofia', 'priya'],
                due: 1,
              },
            ],
          },
          {
            name: 'Design',
            color: 'purple',
            status: 'IN_REVIEW',
            tasks: [
              {
                title: 'Pricing cards — annual vs monthly',
                description: 'Toggle should animate height. Highlight the Team plan.',
                priority: 'MEDIUM',
                cover: 'purple',
                labels: ['Design'],
                assignee: 'priya',
                members: ['priya', 'sofia'],
                start: -4,
                due: 2,
                files: [{ name: 'pricing-cards.fig', mime: 'application/octet-stream', size: 1_204_441 }],
                likes: ['sofia'],
              },
            ],
          },
          {
            name: 'Shipped',
            color: 'green',
            status: 'DONE',
            tasks: [
              {
                title: 'New homepage hero',
                description: 'Dashboard screenshot, short headline, two CTAs.',
                priority: 'HIGH',
                cover: 'green',
                labels: ['Design', 'Engineering'],
                assignee: 'priya',
                members: ['priya', 'jordan', 'sofia'],
                start: -18,
                end: -8,
                due: -8,
                likes: ['maya', 'sofia', 'jordan'],
              },
              {
                title: 'OG images for blog posts',
                description: '1200×630 templates. Title + author + Northstar mark.',
                priority: 'LOW',
                labels: ['Design', 'SEO'],
                assignee: 'priya',
                members: ['priya'],
                start: -12,
                end: -5,
                due: -5,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: 'Atlas Studio',
    description: `${SEED_TAG} Client work and the studio's own internal tools.`,
    projects: [
      {
        name: 'Client · Harbor Coffee',
        description: 'Ordering kiosk + loyalty board for Harbor\'s three cafes.',
        labels: [
          { name: 'Client', color: 'orange' },
          { name: 'Backend', color: 'blue' },
          { name: 'UI', color: 'purple' },
          { name: 'Bug', color: 'red' },
        ],
        columns: [
          {
            name: 'To Do',
            color: 'blue',
            status: 'TODO',
            tasks: [
              {
                title: 'Loyalty punch-card rules',
                description: 'Every 9th drink is free. Reset per cafe, not globally.',
                priority: 'HIGH',
                labels: ['Client', 'Backend'],
                assignee: 'jordan',
                members: ['jordan', 'maya'],
                due: 7,
              },
              {
                title: 'Kiosk idle screen',
                description: 'Loop of 4 seasonal photos. Tap anywhere to start an order.',
                priority: 'MEDIUM',
                cover: 'orange',
                labels: ['UI', 'Client'],
                assignee: 'priya',
                members: ['priya'],
                due: 5,
              },
              {
                title: 'Receipt printer fallback',
                description: 'If the Star printer is offline, email the receipt and show a QR.',
                priority: 'MEDIUM',
                labels: ['Backend'],
                assignee: 'hana',
                members: ['hana', 'jordan'],
                due: 10,
              },
            ],
          },
          {
            name: 'In Progress',
            color: 'sky',
            status: 'IN_PROGRESS',
            tasks: [
              {
                title: 'Modifier groups for drinks',
                description: 'Milk, syrup, extra shot. Max 3 syrups. Prices from the Harbor catalog.',
                priority: 'URGENT',
                cover: 'sky',
                labels: ['Backend', 'UI'],
                assignee: 'jordan',
                members: ['jordan', 'priya', 'owen'],
                start: -4,
                due: 2,
                comments: [
                  { by: 'owen', text: 'Oat milk is sold out at the Broadway shop — we need an unavailable state.', hoursAgo: 9 },
                  { by: 'priya', text: 'Added a struck-through option + toast.', hoursAgo: 2 },
                ],
                likes: ['owen', 'maya'],
              },
              {
                title: 'Cafe switcher on the tablet',
                description: 'Staff PIN then pick a cafe. Persist until end of shift.',
                priority: 'HIGH',
                labels: ['UI'],
                assignee: 'leo',
                members: ['leo', 'kai'],
                start: -2,
                due: 3,
              },
            ],
          },
          {
            name: 'Review',
            color: 'purple',
            status: 'IN_REVIEW',
            tasks: [
              {
                title: 'Tip screen after payment',
                description: '18 / 20 / 25 / custom. Default 20. Skip is still obvious.',
                priority: 'MEDIUM',
                cover: 'purple',
                labels: ['UI', 'Client'],
                assignee: 'priya',
                members: ['priya', 'sofia'],
                due: 1,
                comments: [
                  { by: 'sofia', text: 'Harbor asked us not to pre-select a tip.', hoursAgo: 11 },
                ],
              },
            ],
          },
          {
            name: 'Done',
            color: 'green',
            status: 'DONE',
            tasks: [
              {
                title: 'Catalog import from Square',
                description: 'Nightly sync of items, modifiers, and 86\'d flags.',
                priority: 'HIGH',
                cover: 'green',
                labels: ['Backend'],
                assignee: 'jordan',
                members: ['jordan', 'hana'],
                start: -20,
                end: -9,
                due: -9,
                likes: ['maya', 'hana'],
              },
              {
                title: 'Staff PIN login',
                description: '4-digit PIN, lock after 5 misses, manager override.',
                priority: 'MEDIUM',
                labels: ['UI', 'Backend'],
                assignee: 'leo',
                members: ['leo', 'kai'],
                start: -16,
                end: -7,
                due: -7,
              },
            ],
          },
        ],
      },
      {
        name: 'Internal Tools',
        description: 'Studio ops — time tracking, invoices, and the new hire checklist.',
        labels: [
          { name: 'Ops', color: 'yellow' },
          { name: 'Finance', color: 'green' },
          { name: 'Hiring', color: 'pink' },
        ],
        columns: [
          {
            name: 'To Do',
            color: 'yellow',
            status: 'TODO',
            tasks: [
              {
                title: 'Invoice PDF template',
                description: 'Studio letterhead, line items, and a due-in-14-days footer.',
                priority: 'MEDIUM',
                labels: ['Finance'],
                assignee: 'sofia',
                members: ['sofia', 'maya'],
                due: 9,
              },
              {
                title: 'New-hire laptop checklist',
                description: 'MDM enroll, 1Password, Figma, Linear, and the Northstar repo.',
                priority: 'LOW',
                labels: ['Hiring', 'Ops'],
                assignee: 'kai',
                members: ['kai'],
              },
            ],
          },
          {
            name: 'Doing',
            color: 'sky',
            status: 'IN_PROGRESS',
            tasks: [
              {
                title: 'Weekly time export',
                description: 'CSV of hours by project for the Friday finance review.',
                priority: 'HIGH',
                cover: 'yellow',
                labels: ['Ops', 'Finance'],
                assignee: 'jordan',
                members: ['jordan', 'sofia'],
                start: -3,
                due: 2,
                comments: [
                  { by: 'sofia', text: 'Can we include the Harbor project code HBR-24?', hoursAgo: 16 },
                ],
              },
            ],
          },
          {
            name: 'Done',
            color: 'green',
            status: 'DONE',
            tasks: [
              {
                title: 'Shared component library',
                description: 'Buttons, inputs, and the dialog we reuse on client boards.',
                priority: 'MEDIUM',
                cover: 'lime',
                labels: ['Ops'],
                assignee: 'priya',
                members: ['priya', 'jordan'],
                start: -30,
                end: -14,
                due: -14,
                likes: ['jordan', 'maya'],
              },
            ],
          },
        ],
      },
    ],
  },
]

const COMMENT_BANK = [
  'Leaving a note so this does not get lost in Slack.',
  'Happy to pair on this after standup.',
  'Updated the description with the acceptance criteria.',
  'This is unblocked on my side — take another look?',
  'Screenshot is in Figma, page “Ready for eng”.',
]

const ansi = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m',
}

const paint = (color: keyof typeof ansi, value: string) =>
  `${ansi[color]}${value}${ansi.reset}`

const log = {
  title: (value: string) => console.log(paint('bold', value)),
  dim: (value: string) => console.log(paint('dim', `  ${value}`)),
  ok: (value: string) => console.log(paint('green', `  ✓  ${value}`)),
  info: (value: string) => console.log(paint('cyan', `  →  ${value}`)),
  warn: (value: string) => console.log(paint('yellow', `  !  ${value}`)),
}

function daysFromNow(days: number) {
  const date = new Date()
  date.setHours(10, 0, 0, 0)
  date.setDate(date.getDate() + days)
  return date
}

function hoursAgo(hours: number) {
  return new Date(Date.now() - hours * 3_600_000)
}

function avatarUrl(name: string) {
  return `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(name)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`
}

function hash(value: string) {
  let next = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    next ^= value.charCodeAt(index)
    next = Math.imul(next, 16777619)
  }
  return next >>> 0
}

function pick<T>(items: T[], seed: string): T {
  return items[hash(seed) % items.length]
}

function pickN<T>(items: T[], count: number, seed: string): T[] {
  const pool = [...items]
  const chosen: T[] = []
  let state = hash(seed)
  while (chosen.length < count && pool.length) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    const index = state % pool.length
    chosen.push(pool.splice(index, 1)[0])
  }
  return chosen
}

function clerkObject(name: string) {
  return {
    firstName: name.split(' ')[0],
    lastName: name.split(' ').slice(1).join(' '),
    imageUrl: avatarUrl(name),
    image_url: avatarUrl(name),
  }
}

async function resetSeedData() {
  const seeded = await prisma.workspace.findMany({
    where: { description: { startsWith: SEED_TAG } },
    select: { id: true },
  })

  if (seeded.length) {
    await prisma.workspace.deleteMany({
      where: { id: { in: seeded.map((workspace) => workspace.id) } },
    })
  }

  await prisma.user.deleteMany({
    where: { clerkId: { startsWith: SEED_CLERK } },
  })
}

async function upsertTeam() {
  const byKey = {} as Record<PersonKey, { id: string; name: string; email: string }>

  for (const key of PERSON_KEYS) {
    const person = TEAM[key]
    const user = await prisma.user.upsert({
      where: { email: person.email },
      update: {
        name: person.name,
        clerkId: `${SEED_CLERK}${key}`,
        clerkObject: clerkObject(person.name),
      },
      create: {
        clerkId: `${SEED_CLERK}${key}`,
        email: person.email,
        name: person.name,
        clerkObject: clerkObject(person.name),
      },
    })
    byKey[key] = { id: user.id, name: user.name ?? person.name, email: user.email }
  }

  return byKey
}

async function realUsers() {
  return prisma.user.findMany({
    where: { clerkId: { not: { startsWith: SEED_CLERK } } },
    orderBy: { createdAt: 'asc' },
  })
}

function taskActivity(draft: TaskDraft, column: ColumnDraft, creatorKey: PersonKey) {
  const createdHours = 24 + hash(draft.title) % 240
  const events: {
    type: string
    message: string
    userKey: PersonKey
    at: Date
    metadata?: Record<string, unknown>
  }[] = [
    {
      type: 'CREATED',
      message: 'created this card',
      userKey: creatorKey,
      at: hoursAgo(createdHours),
    },
  ]

  if (draft.priority && draft.priority !== 'MEDIUM') {
    events.push({
      type: 'PRIORITY_CHANGED',
      message: `set priority to ${draft.priority.toLowerCase()}`,
      userKey: draft.assignee ?? creatorKey,
      at: hoursAgo(createdHours - 2),
      metadata: { priority: draft.priority },
    })
  }

  if (column.status !== 'TODO') {
    events.push({
      type: 'MOVED',
      message: `moved this card to ${column.name}`,
      userKey: draft.assignee ?? creatorKey,
      at: hoursAgo(Math.max(2, createdHours - 20)),
      metadata: { toColumn: column.name },
    })
    events.push({
      type: 'STATUS_CHANGED',
      message: `set status to ${column.status.replaceAll('_', ' ').toLowerCase()}`,
      userKey: draft.assignee ?? creatorKey,
      at: hoursAgo(Math.max(1, createdHours - 21)),
      metadata: { status: column.status },
    })
  }

  if (column.status === 'DONE') {
    events.push({
      type: 'COMPLETED',
      message: 'marked this card complete',
      userKey: draft.assignee ?? creatorKey,
      at: hoursAgo(Math.max(1, Math.abs(draft.end ?? 3) * 20)),
    })
  }

  for (const label of draft.labels ?? []) {
    events.push({
      type: 'LABEL_ADDED',
      message: `added the ${label} label`,
      userKey: creatorKey,
      at: hoursAgo(createdHours - 1),
      metadata: { label },
    })
  }

  if (draft.cover) {
    events.push({
      type: 'COVER_CHANGED',
      message: 'changed the cover',
      userKey: creatorKey,
      at: hoursAgo(createdHours - 3),
    })
  }

  if (draft.due !== undefined || draft.start !== undefined) {
    events.push({
      type: 'DATES_UPDATED',
      message: 'updated the dates',
      userKey: draft.assignee ?? creatorKey,
      at: hoursAgo(createdHours - 4),
    })
  }

  for (const member of draft.members ?? []) {
    events.push({
      type: 'MEMBER_ADDED',
      message: `added ${TEAM[member].name} to this card`,
      userKey: creatorKey,
      at: hoursAgo(createdHours - 5),
    })
  }

  for (const like of draft.likes ?? []) {
    events.push({
      type: 'LIKED',
      message: 'liked this card',
      userKey: like,
      at: hoursAgo(2 + hash(draft.title + like) % 40),
    })
  }

  return events.sort((a, b) => a.at.getTime() - b.at.getTime())
}

async function seedProject(
  projectId: string,
  draft: ProjectDraft,
  ownerId: string,
  people: Record<PersonKey, { id: string }>,
  extraMemberIds: string[],
) {
  const labels = new Map<string, string>()

  for (const label of draft.labels) {
    const row = await prisma.label.create({
      data: {
        name: label.name,
        color: COLORS[label.color],
        projectId,
        createdBy: ownerId,
      },
    })
    labels.set(label.name, row.id)
  }

  let taskCount = 0
  let commentCount = 0
  let activityCount = 0

  for (const [columnOrder, column] of draft.columns.entries()) {
    const createdColumn = await prisma.taskColumn.create({
      data: {
        name: column.name,
        order: columnOrder,
        color: column.color ?? null,
        archivedAt: column.archived ? hoursAgo(48) : null,
        projectId,
      },
    })

    for (const [taskOrder, task] of column.tasks.entries()) {
      const creatorKey = task.assignee ?? pick(PERSON_KEYS, task.title)
      const assigneeKey = task.assignee ?? creatorKey
      const memberKeys = task.members?.length
        ? Array.from(new Set(task.members))
        : pickN(PERSON_KEYS, 1 + (hash(task.title) % 3), `${task.title}:members`)

      const created = await prisma.task.create({
        data: {
          title: task.title,
          description: task.description ?? null,
          order: taskOrder,
          priority: task.priority ?? 'MEDIUM',
          status: task.status ?? column.status,
          completedAt: (task.status ?? column.status) === 'DONE'
            ? daysFromNow(task.end ?? -2)
            : null,
          dueDate: task.due !== undefined ? daysFromNow(task.due) : null,
          startDate: null,
          endDate: null,
          coverColor: task.cover ?? null,
          columnId: createdColumn.id,
          projectId,
          createdBy: people[creatorKey].id,
          assigneeId: people[assigneeKey].id,
          createdAt: hoursAgo(30 + hash(task.title) % 400),
          members: {
            create: memberKeys.map((key) => ({ userId: people[key].id })),
          },
          taskLabels: {
            create: (task.labels ?? [])
              .map((name) => labels.get(name))
              .filter((id): id is string => Boolean(id))
              .map((labelId) => ({ labelId })),
          },
          likes: {
            create: (task.likes ?? []).map((key) => ({ userId: people[key].id })),
          },
        },
      })

      if (task.files?.length) {
        await prisma.attachment.createMany({
          data: task.files.map((file) => ({
            name: file.name,
            url: `https://picsum.photos/seed/${encodeURIComponent(file.name)}/1200/800`,
            size: file.size,
            mimeType: file.mime,
            attachableType: 'Task',
            attachableId: created.id,
            uploadedBy: people[creatorKey].id,
          })),
        })
      }

      const comments = task.comments?.length
        ? task.comments
        : hash(task.title) % 3 === 0
          ? [{
              by: pick(memberKeys, `${task.title}:comment`),
              text: pick(COMMENT_BANK, task.title),
              hoursAgo: 4 + (hash(task.title) % 48),
            }]
          : []

      for (const comment of comments) {
        await prisma.taskComment.create({
          data: {
            content: comment.text,
            taskId: created.id,
            userId: people[comment.by].id,
            createdAt: hoursAgo(comment.hoursAgo),
          },
        })
        await prisma.taskActivity.create({
          data: {
            type: 'COMMENT',
            message: 'commented on this card',
            taskId: created.id,
            userId: people[comment.by].id,
            createdAt: hoursAgo(comment.hoursAgo),
          },
        })
        commentCount += 1
        activityCount += 1
      }

      const activities = taskActivity(task, column, creatorKey)
      for (const activity of activities) {
        await prisma.taskActivity.create({
          data: {
            type: activity.type,
            message: activity.message,
            metadata: activity.metadata ?? undefined,
            taskId: created.id,
            userId: people[activity.userKey].id,
            createdAt: activity.at,
          },
        })
        activityCount += 1
      }

      taskCount += 1
    }
  }

  const projectMemberIds = new Set<string>([ownerId, ...extraMemberIds])
  for (const key of PERSON_KEYS) projectMemberIds.add(people[key].id)

  await prisma.projectMember.createMany({
    data: [...projectMemberIds].map((userId) => ({
      userId,
      projectId,
      role: userId === ownerId ? 'OWNER' : 'MEMBER',
    })),
    skipDuplicates: true,
  })

  return { taskCount, commentCount, activityCount }
}

async function main() {
  console.log('')
  log.title('┌─────────────────────────────────────────────────────────┐')
  log.title('│  Northstar seed                                         │')
  log.title('│  Workspaces, boards, and a lived-in task history        │')
  log.title('└─────────────────────────────────────────────────────────┘')
  console.log('')

  log.info('Clearing previous seed data…')
  await resetSeedData()
  log.ok('Previous seed rows removed')

  const people = await upsertTeam()
  log.ok(`${PERSON_KEYS.length} demo teammates`)

  const signedIn = await realUsers()
  if (signedIn.length) {
    for (const user of signedIn) {
      log.ok(`Attached signed-in account  ${user.email}`)
    }
  } else {
    log.warn('No Clerk user in the database yet.')
    log.dim('Sign in once, then run npm run db:seed again so your account owns these boards.')
  }

  const owner = signedIn[0]
  const ownerId = owner?.id ?? people.maya.id

  let workspaceCount = 0
  let projectCount = 0
  let columnCount = 0
  let taskCount = 0
  let commentCount = 0
  let activityCount = 0
  let firstWorkspaceId: string | null = null
  let firstProjectId: string | null = null

  for (const workspaceDraft of WORKSPACES) {
    const workspace = await prisma.workspace.create({
      data: {
        name: workspaceDraft.name,
        description: workspaceDraft.description,
        createdBy: ownerId,
        members: {
          create: [
            { userId: ownerId, role: 'OWNER' },
            ...PERSON_KEYS
              .map((key) => people[key].id)
              .filter((id) => id !== ownerId)
              .map((userId) => ({ userId, role: 'MEMBER' as const })),
            ...signedIn
              .slice(1)
              .filter((user) => user.id !== ownerId)
              .map((user) => ({ userId: user.id, role: 'ADMIN' as const })),
          ],
        },
        settings: {
          create: {},
        },
      },
    })

    workspaceCount += 1
    if (!firstWorkspaceId) firstWorkspaceId = workspace.id

    for (const projectDraft of workspaceDraft.projects) {
      const project = await prisma.project.create({
        data: {
          name: projectDraft.name,
          description: projectDraft.description,
          workspaceId: workspace.id,
          createdBy: ownerId,
        },
      })

      projectCount += 1
      columnCount += projectDraft.columns.length
      if (!firstProjectId) firstProjectId = project.id

      const extraMemberIds = signedIn.map((user) => user.id)
      const seeded = await seedProject(project.id, projectDraft, ownerId, people, extraMemberIds)
      taskCount += seeded.taskCount
      commentCount += seeded.commentCount
      activityCount += seeded.activityCount
    }
  }

  const focusIds = {
    activeWorkspaceId: firstWorkspaceId,
    activeProjectId: firstProjectId,
  }

  if (signedIn.length) {
    await prisma.user.updateMany({
      where: { id: { in: signedIn.map((user) => user.id) } },
      data: focusIds,
    })
  }

  await prisma.user.update({
    where: { id: people.maya.id },
    data: focusIds,
  })

  console.log('')
  log.ok(`${workspaceCount} workspaces`)
  log.ok(`${projectCount} projects`)
  log.ok(`${columnCount} lists`)
  log.ok(`${taskCount} cards`)
  log.ok(`${commentCount} comments · ${activityCount} activity events`)
  console.log('')
  log.info('Open the dashboard and switch to “Northstar”.')
  log.dim('Re-run anytime with  npm run db:seed')
  console.log('')
}

main()
  .catch((error) => {
    console.error('')
    console.error(paint('bold', '  Seed failed'))
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
