export const PLAN_IDS = ["free", "team", "business"] as const
export type PlanId = (typeof PLAN_IDS)[number]

export const PLAN_INTERVALS = ["month", "year"] as const
export type PlanInterval = (typeof PLAN_INTERVALS)[number]

export type PlanLimits = {
  workspaces: number | null
  projects: number | null
  members: number | null
}

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free: { workspaces: 1, projects: 3, members: 5 },
  team: { workspaces: 1, projects: null, members: null },
  business: { workspaces: null, projects: null, members: null },
}

/** Per-member price shown on the marketing page. Yearly is the monthly equivalent. */
export const PLAN_PRICES = {
  team: { month: 16, year: 12 },
  business: { month: 32, year: 24 },
} as const

export const STRIPE_LOOKUP_KEYS = {
  team: {
    month: "northstar_team_monthly",
    year: "northstar_team_yearly",
  },
  business: {
    month: "northstar_business_monthly",
    year: "northstar_business_yearly",
  },
} as const

export const PAID_PLAN_STATUSES = [
  "active",
  "trialing",
  "past_due",
] as const

export const isPlanId = (value: string): value is PlanId =>
  (PLAN_IDS as readonly string[]).includes(value)

export const isPaidPlan = (plan: string): plan is Exclude<PlanId, "free"> =>
  plan === "team" || plan === "business"

export const isPlanInterval = (value: string): value is PlanInterval =>
  (PLAN_INTERVALS as readonly string[]).includes(value)

export const hasPaidAccess = (subscription: {
  plan: string
  status: string
}) =>
  isPaidPlan(subscription.plan) &&
  (PAID_PLAN_STATUSES as readonly string[]).includes(subscription.status)

export const effectivePlan = (subscription: {
  plan: string
  status: string
} | null): PlanId =>
  subscription && hasPaidAccess(subscription) && isPlanId(subscription.plan)
    ? subscription.plan
    : "free"

export const planLimits = (plan: PlanId) => PLAN_LIMITS[plan]

export const canAddWithinLimit = (used: number, limit: number | null) =>
  limit == null || used < limit

export const yearlyUnitAmount = (monthlyEquivalent: number) =>
  monthlyEquivalent * 12 * 100

export const monthlyUnitAmount = (monthly: number) => monthly * 100

export const formatMoney = (cents: number, currency = "usd") =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100)

