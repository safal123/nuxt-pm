import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, it, beforeEach } from "vitest";
import { createColumn, createTask } from "../../fixtures/board";
import KanbanColumn from "~/components/kanban/KanbanColumn.vue";

describe("KanbanColumn collapse", () => {
  beforeEach(() => {
    localStorage.removeItem("kanban-collapsed-columns");
  });

  it("collapses into a vertical strip and expands again", async () => {
    const wrapper = await mountSuspended(KanbanColumn, {
      props: {
        column: createColumn({
          name: "In Progress",
          tasks: [createTask({ title: "Ship the invite email" })],
        }),
      },
    });

    expect(wrapper.get("[data-column-id]").classes()).toContain("w-80");
    expect(wrapper.text()).toContain("Ship the invite email");

    await wrapper.get('[aria-label="Collapse list"]').trigger("click");

    const strip = wrapper.get("[data-collapsed=true]");
    expect(strip.classes()).not.toContain("h-[calc(100vh-12rem)]");
    expect(strip.text()).toContain("In Progress");
    expect(strip.text()).toContain("1");
    expect(wrapper.text()).not.toContain("Ship the invite email");

    await strip.trigger("click");

    expect(wrapper.find("[data-collapsed=true]").exists()).toBe(false);
    expect(wrapper.get("[data-column-id]").classes()).toContain("w-80");
    expect(wrapper.text()).toContain("Ship the invite email");
  });
});
