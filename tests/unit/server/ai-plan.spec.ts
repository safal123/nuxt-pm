// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

vi.mock("~/lib/prisma", () => ({ default: {} }));
vi.mock("~/server/utils/ai", () => ({ completeChat: vi.fn() }));

import { parseTaskPlan } from "~/server/utils/ai-plan";
import { aiTaskPlanApplySchema, aiTaskPlanRequestSchema } from "~/server/utils/schemas";
import { AI_PLAN_MAX_TASKS, planningColumnId } from "~/utils/ai-plan";

describe("parseTaskPlan", () => {
  it("turns the AI JSON into cards with steps and a done check", () => {
    const tasks = parseTaskPlan(
      '```json\n{"tasks":[{"title":"Design pricing table","summary":"Compare plans side by side.","steps":["1. List plan limits","- Sketch layout"],"doneWhen":"Design is approved.","priority":"high"}]}\n```',
    );
    expect(tasks).toEqual([
      {
        title: "Design pricing table",
        description:
          "Compare plans side by side.\n\nSteps:\n- List plan limits\n- Sketch layout\n\nDone when: Design is approved.",
        priority: "HIGH",
      },
    ]);
  });

  it("drops invalid rows and caps the count", () => {
    const rows = Array.from({ length: 20 }, (_, i) => ({ title: `Task ${i}` }));
    const tasks = parseTaskPlan(
      JSON.stringify({ tasks: [{ title: "" }, { title: "Bad", priority: "NOPE" }, ...rows] }),
    );
    expect(tasks).toHaveLength(AI_PLAN_MAX_TASKS);
    expect(tasks[0]).toEqual({ title: "Task 0", description: null, priority: "MEDIUM" });
  });

  it("returns nothing for prose or broken JSON", () => {
    expect(parseTaskPlan("Sure! Here is a plan: do things.")).toEqual([]);
    expect(parseTaskPlan('{"tasks": [ {"title": ')).toEqual([]);
    expect(parseTaskPlan('{"items": []}')).toEqual([]);
  });
});

describe("AI plan schemas", () => {
  it("requires a meaningful goal", () => {
    const result = aiTaskPlanRequestSchema.safeParse({ columnId: "c1", goal: " short " });
    expect(result.success).toBe(false);
  });

  it("requires the goal and at least one task to apply", () => {
    const goal = "Ship the onboarding checklist";
    expect(aiTaskPlanApplySchema.safeParse({ columnId: "c1", goal, tasks: [] }).success).toBe(false);
    expect(
      aiTaskPlanApplySchema.safeParse({ columnId: "c1", tasks: [{ title: "Ship it" }] }).success,
    ).toBe(false);
    const parsed = aiTaskPlanApplySchema.parse({
      columnId: "c1",
      goal: `  ${goal}  `,
      tasks: [{ title: " Ship it " }],
    });
    expect(parsed.goal).toBe(goal);
    expect(parsed.tasks[0]).toEqual({ title: "Ship it", description: undefined, priority: "MEDIUM" });
  });
});

describe("planningColumnId", () => {
  it("prefers a To Do or Backlog list", () => {
    expect(
      planningColumnId([
        { id: "a", name: "Ideas" },
        { id: "b", name: "  to   DO " },
      ]),
    ).toBe("b");
    expect(planningColumnId([{ id: "x", name: "Doing" }, { id: "y", name: "Backlog" }])).toBe("y");
  });

  it("falls back to the first list", () => {
    expect(planningColumnId([{ id: "x", name: "Doing" }, { id: "y", name: "Done" }])).toBe("x");
    expect(planningColumnId([])).toBeNull();
  });
});
