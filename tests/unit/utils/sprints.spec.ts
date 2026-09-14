// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  isHistoricSprint,
  nextSprintNumber,
  resolveSprintFilter,
  sprintTitle,
  sprintWhere,
  taskMatchesSprint,
} from "~/utils/sprints";

describe("sprint helpers", () => {
  it("increments sprint numbers from the stored number", () => {
    expect(nextSprintNumber([])).toBe(1);
    expect(nextSprintNumber([{ number: 1 }, { number: 3 }])).toBe(4);
    expect(sprintTitle(4)).toBe("Sprint 4");
  });

  it("treats completed and cancelled sprints as historic", () => {
    expect(isHistoricSprint("COMPLETED")).toBe(true);
    expect(isHistoricSprint("CANCELLED")).toBe(true);
    expect(isHistoricSprint("ACTIVE")).toBe(false);
    expect(isHistoricSprint("PLANNED")).toBe(false);
  });

  it("shows every card until a sprint exists", () => {
    expect(resolveSprintFilter("current", null, 0)).toEqual({ type: "all" });
  });

  it("uses the active sprint for the current view", () => {
    expect(resolveSprintFilter("current", { id: "s1" }, 2)).toEqual({
      type: "sprint",
      sprintId: "s1",
    });
  });

  it("falls back to the backlog between sprints", () => {
    expect(resolveSprintFilter("current", null, 2)).toEqual({ type: "backlog" });
  });

  it("filters backlog and a previous sprint by id", () => {
    expect(resolveSprintFilter("backlog", { id: "s1" }, 2)).toEqual({
      type: "backlog",
    });
    expect(resolveSprintFilter("s-old", { id: "s1" }, 2)).toEqual({
      type: "sprint",
      sprintId: "s-old",
    });
  });

  it("maps filters onto Prisma where clauses", () => {
    expect(sprintWhere({ type: "all" })).toBeUndefined();
    expect(sprintWhere({ type: "backlog" })).toEqual({ sprintId: null });
    expect(sprintWhere({ type: "sprint", sprintId: "s1" })).toEqual({
      sprintId: "s1",
    });
  });

  it("matches cards against the active filter", () => {
    expect(taskMatchesSprint({ sprintId: null }, { type: "all" })).toBe(true);
    expect(taskMatchesSprint({ sprintId: null }, { type: "backlog" })).toBe(true);
    expect(taskMatchesSprint({ sprintId: "s1" }, { type: "backlog" })).toBe(false);
    expect(
      taskMatchesSprint({ sprintId: "s1" }, { type: "sprint", sprintId: "s1" }),
    ).toBe(true);
  });
});
