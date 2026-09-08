import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, it } from "vitest";
import { createTask } from "../../fixtures/board";
import TaskCard from "~/components/kanban/TaskCard.vue";

// The workspace tint is applied with `color-mix()`, which happy-dom discards as
// an unknown CSS value, so it cannot be asserted here. The colour itself is
// covered in tests/unit/utils/task-colors.spec.ts.
describe("TaskCard", () => {
  it("renders the title with its status and priority", async () => {
    const wrapper = await mountSuspended(TaskCard, {
      props: { task: createTask({ title: "Ship the invite email" }) },
    });

    expect(wrapper.text()).toContain("Ship the invite email");
    expect(wrapper.text()).toContain("To do");
    expect(wrapper.text()).toContain("MEDIUM");
  });

  it("strikes through a completed card", async () => {
    const wrapper = await mountSuspended(TaskCard, {
      props: { task: createTask({ status: "DONE" }) },
    });

    expect(wrapper.find("p.line-through").exists()).toBe(true);
  });

  it("shows label names and counts the overflow", async () => {
    const wrapper = await mountSuspended(TaskCard, {
      props: {
        task: createTask({
          labels: [
            { id: "l1", name: "Design", color: "#c377e0" },
            { id: "l2", name: "Backend", color: "#0079bf" },
            { id: "l3", name: "Urgent", color: "#eb5a46" },
            { id: "l4", name: "Later", color: "#61bd4f" },
          ],
        }),
      },
    });

    expect(wrapper.text()).toContain("Design");
    expect(wrapper.text()).toContain("+1");
  });

  it("renders the due date when one is set", async () => {
    const wrapper = await mountSuspended(TaskCard, {
      props: { task: createTask({ dueDate: "2026-03-05T12:00:00.000Z" }) },
    });

    expect(wrapper.text()).toContain("Mar");
  });
});
