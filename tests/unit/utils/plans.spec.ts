// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  canAddWithinLimit,
  effectivePlan,
  formatMoney,
  hasPaidAccess,
  monthlyUnitAmount,
  PLAN_LIMITS,
  yearlyUnitAmount,
} from "~/utils/plans";

describe("plan limits", () => {
  it("treats inactive or free rows as the free plan", () => {
    expect(effectivePlan(null)).toBe("free");
    expect(effectivePlan({ plan: "team", status: "canceled" })).toBe("free");
    expect(effectivePlan({ plan: "business", status: "active" })).toBe("business");
    expect(hasPaidAccess({ plan: "team", status: "past_due" })).toBe(true);
  });

  it("blocks free-plan extras and allows unlimited paid seats", () => {
    expect(canAddWithinLimit(1, PLAN_LIMITS.free.workspaces)).toBe(false);
    expect(canAddWithinLimit(3, PLAN_LIMITS.free.projects)).toBe(false);
    expect(canAddWithinLimit(5, PLAN_LIMITS.free.members)).toBe(false);
    expect(canAddWithinLimit(4, PLAN_LIMITS.free.members)).toBe(true);
    expect(canAddWithinLimit(100, PLAN_LIMITS.team.members)).toBe(true);
    expect(canAddWithinLimit(8, PLAN_LIMITS.business.workspaces)).toBe(true);
  });

  it("prices yearly seats as 12 months", () => {
    expect(monthlyUnitAmount(16)).toBe(1600);
    expect(yearlyUnitAmount(12)).toBe(14400);
  });

  it("formats Stripe amounts from cents", () => {
    expect(formatMoney(3360, "usd")).toBe("$33.60");
    expect(formatMoney(9600)).toBe("$96.00");
  });
});
