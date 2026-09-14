import { describe, expect, it, beforeEach } from "vitest";
import { useCollapsedColumns } from "~/composables/useCollapsedColumns";

describe("useCollapsedColumns", () => {
  beforeEach(() => {
    localStorage.removeItem("kanban-collapsed-columns");
  });

  it("collapses and expands a column for one project", () => {
    const { isCollapsed, setCollapsed, toggle } = useCollapsedColumns("project-1");

    expect(isCollapsed("col-a")).toBe(false);
    setCollapsed("col-a", true);
    expect(isCollapsed("col-a")).toBe(true);
    toggle("col-a");
    expect(isCollapsed("col-a")).toBe(false);
  });

  it("keeps collapse state isolated by project", () => {
    const projectA = useCollapsedColumns("project-a");
    const projectB = useCollapsedColumns("project-b");

    projectA.setCollapsed("col-1", true);

    expect(projectA.isCollapsed("col-1")).toBe(true);
    expect(projectB.isCollapsed("col-1")).toBe(false);
  });
});
