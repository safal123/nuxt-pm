import { describe, expect, it } from "vitest";
import { createTask } from "../../fixtures/board";
import {
  defaultBoardQuery,
  filterColumnTasks,
  isAssignedToUser,
  matchesTask,
  sortTasks,
  visibleDropIndex,
  type BoardQuery,
} from "~/utils/board-query";

const me = { id: "user-1", name: "Ada", email: "ada@example.com", imageUrl: null };
const other = { id: "user-2", name: "Lin", email: "lin@example.com", imageUrl: null };

const query = (patch: Partial<BoardQuery> = {}): BoardQuery => ({
  ...defaultBoardQuery(),
  ...patch,
});

const options = { userId: me.id };

describe("board query", () => {
  it("matches search against title", () => {
    const task = createTask({ title: "Ship invite email" });
    expect(matchesTask(task, query({ search: "invite" }), options)).toBe(true);
    expect(matchesTask(task, query({ search: "billing" }), options)).toBe(false);
  });

  it("treats assignee and members as assigned to me", () => {
    const assigned = createTask({ assignee: me });
    const member = createTask({ members: [me] });
    const nobody = createTask({ assignee: other, members: [other] });

    expect(isAssignedToUser(assigned, me.id)).toBe(true);
    expect(matchesTask(assigned, query({ assignee: "me" }), options)).toBe(true);
    expect(matchesTask(member, query({ assignee: "me" }), options)).toBe(true);
    expect(matchesTask(nobody, query({ assignee: "me" }), options)).toBe(false);
    expect(matchesTask(createTask(), query({ assignee: "unassigned" }), options)).toBe(
      true,
    );
  });

  it("filters overdue incomplete cards and ignores completed ones", () => {
    const overdue = createTask({
      dueDate: "2020-01-01T12:00:00.000Z",
      status: "TODO",
    });
    const done = createTask({
      dueDate: "2020-01-01T12:00:00.000Z",
      status: "DONE",
    });
    expect(matchesTask(overdue, query({ due: "overdue" }), options)).toBe(true);
    expect(matchesTask(done, query({ due: "overdue" }), options)).toBe(false);
    expect(matchesTask(createTask(), query({ due: "none" }), options)).toBe(true);
  });

  it("filters open vs completed cards", () => {
    const open = createTask({ status: "IN_PROGRESS" });
    const done = createTask({ status: "DONE" });
    expect(matchesTask(open, query({ completion: "open" }), options)).toBe(true);
    expect(matchesTask(done, query({ completion: "open" }), options)).toBe(false);
    expect(matchesTask(done, query({ completion: "done" }), options)).toBe(true);
  });

  it("filters by priority and any selected label", () => {
    const task = createTask({
      priority: "URGENT",
      labels: [
        { id: "bug", name: "Bug", color: "#f00" },
        { id: "ui", name: "UI", color: "#00f" },
      ],
    });
    expect(
      matchesTask(task, query({ priorities: ["HIGH"] }), options),
    ).toBe(false);
    expect(
      matchesTask(task, query({ priorities: ["URGENT", "HIGH"] }), options),
    ).toBe(true);
    expect(matchesTask(task, query({ labelIds: ["ui"] }), options)).toBe(true);
    expect(matchesTask(task, query({ labelIds: ["ops"] }), options)).toBe(false);
  });

  it("sorts by due date, then priority", () => {
    const later = createTask({
      id: "later",
      dueDate: "2026-12-01T00:00:00.000Z",
      priority: "LOW",
    });
    const soon = createTask({
      id: "soon",
      dueDate: "2026-03-01T00:00:00.000Z",
      priority: "MEDIUM",
    });
    const none = createTask({ id: "none", dueDate: null, priority: "URGENT" });

    expect(sortTasks([later, none, soon], "due").map((task) => task.id)).toEqual([
      "soon",
      "later",
      "none",
    ]);
    expect(
      sortTasks([later, none, soon], "priority").map((task) => task.id),
    ).toEqual(["none", "soon", "later"]);
  });

  it("maps a filtered drop index back onto the full column", () => {
    const hidden = createTask({ id: "hidden", title: "Skip me" });
    const a = createTask({ id: "a", title: "Keep a" });
    const b = createTask({ id: "b", title: "Keep b" });
    const tasks = [hidden, a, b];
    const visible = filterColumnTasks(tasks, query({ search: "keep" }), options);

    expect(visible.map((task) => task.id)).toEqual(["a", "b"]);
    expect(visibleDropIndex(tasks, visible, 0)).toBe(1);
    expect(visibleDropIndex(tasks, visible, 1)).toBe(2);
    expect(visibleDropIndex(tasks, visible, 2)).toBe(3);
  });
});
