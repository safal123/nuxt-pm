import { registerEndpoint } from "@nuxt/test-utils/runtime";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";
import { createColumn, createTask } from "../../fixtures/board";
import { useBoardStore } from "~/stores/board";

registerEndpoint("/api/tasks/task-1", {
  method: "PATCH",
  handler: () => ({
    data: { task: createTask({ archivedAt: "2026-03-05T12:00:00.000Z" }) },
  }),
});

describe("useBoardStore", () => {
  let store: ReturnType<typeof useBoardStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useBoardStore();
  });

  describe("moveDraggingTo", () => {
    it("reorders within a column and reindexes the tasks", () => {
      const a = createTask({ id: "a", order: 0 });
      const b = createTask({ id: "b", order: 1 });
      const c = createTask({ id: "c", order: 2 });
      store.columns = [createColumn({ tasks: [a, b, c] })];

      store.startDrag(a, { width: 100, height: 40 });
      store.moveDraggingTo("column-1", 2);

      expect(store.columns[0].tasks.map((task) => task.id)).toEqual(["b", "c", "a"]);
      expect(store.columns[0].tasks.map((task) => task.order)).toEqual([0, 1, 2]);
    });

    it("moves a task to another column and retargets its columnId", () => {
      const task = createTask({ id: "a" });
      store.columns = [
        createColumn({ tasks: [task] }),
        createColumn({ id: "column-2", name: "Doing" }),
      ];

      store.startDrag(task, { width: 100, height: 40 });
      store.moveDraggingTo("column-2", 0);

      expect(store.columns[0].tasks).toHaveLength(0);
      expect(store.columns[1].tasks.map((item) => item.id)).toEqual(["a"]);
      expect(store.columns[1].tasks[0].columnId).toBe("column-2");
    });

    it("carries the completed count across when a done task moves", () => {
      const done = createTask({ id: "a", status: "DONE" });
      store.columns = [
        createColumn({ tasks: [done], completedCount: 1 }),
        createColumn({ id: "column-2", name: "Doing" }),
      ];

      store.startDrag(done, { width: 100, height: 40 });
      store.moveDraggingTo("column-2", 0);

      expect(store.columns[0].completedCount).toBe(0);
      expect(store.columns[1].completedCount).toBe(1);
    });
  });

  describe("archiveTask", () => {
    it("drops the card from the board and signals dependent lists", async () => {
      store.columns = [createColumn({ tasks: [createTask({ id: "task-1" })] })];
      const before = store.listVersion;

      await store.archiveTask("task-1");

      expect(store.columns[0].tasks).toHaveLength(0);
      expect(store.listVersion).toBeGreaterThan(before);
    });

    it("clears the open card when it is the one being archived", async () => {
      const task = createTask({ id: "task-1" });
      store.columns = [createColumn({ tasks: [task] })];
      store.selectedTask = task;

      await store.archiveTask("task-1");

      expect(store.selectedTask).toBeNull();
    });
  });
});
