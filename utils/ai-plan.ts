import type { TaskColumn } from "~/types";

export const AI_PLAN_GOAL_MIN = 10;
export const AI_PLAN_GOAL_MAX = 2000;
export const AI_PLAN_MAX_TASKS = 12;

const PLANNING_COLUMN_NAMES = new Set(["to do", "todo", "to-do", "backlog"]);

const normalizeName = (name: string) => name.trim().toLowerCase().replace(/\s+/g, " ");

/**
 * The one list where AI planning is offered: a "To Do" / "Backlog" list, or the
 * first list when the board has neither.
 */
export const planningColumnId = (columns: Pick<TaskColumn, "id" | "name">[]) =>
  columns.find((column) => PLANNING_COLUMN_NAMES.has(normalizeName(column.name)))?.id ??
  columns[0]?.id ??
  null;
