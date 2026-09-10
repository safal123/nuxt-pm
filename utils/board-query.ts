import {
  isPast,
  isThisWeek,
  isToday,
  parseISO,
  startOfDay,
} from "date-fns";
import type { Task, TaskColumn, TaskPriority } from "~/types";

export type DueFilter = "any" | "overdue" | "today" | "week" | "none";
export type AssigneeFilter = "any" | "me" | "unassigned";
export type CompletionFilter = "all" | "open" | "done";
export type BoardSort = "board" | "due" | "priority" | "newest" | "title";

export type BoardQuery = {
  search: string;
  due: DueFilter;
  assignee: AssigneeFilter;
  completion: CompletionFilter;
  priorities: TaskPriority[];
  labelIds: string[];
  sort: BoardSort;
};

export type BoardQueryOptions = {
  userId: string | null;
  weekStartsOn?: 0 | 1;
};

const PRIORITY_RANK: Record<TaskPriority, number> = {
  URGENT: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

export const defaultBoardQuery = (): BoardQuery => ({
  search: "",
  due: "any",
  assignee: "any",
  completion: "all",
  priorities: [],
  labelIds: [],
  sort: "board",
});

export const isBoardQueryActive = (query: BoardQuery) =>
  Boolean(query.search.trim()) ||
  query.due !== "any" ||
  query.assignee !== "any" ||
  query.completion !== "all" ||
  query.priorities.length > 0 ||
  query.labelIds.length > 0 ||
  query.sort !== "board";

export const boardFilterCount = (query: BoardQuery) => {
  let count = 0;
  if (query.due !== "any") count += 1;
  if (query.assignee !== "any") count += 1;
  if (query.completion !== "all") count += 1;
  if (query.priorities.length) count += 1;
  if (query.labelIds.length) count += 1;
  return count;
};

export const parseTaskDate = (value: Date | string | null | undefined) => {
  if (!value) return null;
  const date = typeof value === "string" ? parseISO(value) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const isAssignedToUser = (task: Task, userId: string | null) => {
  if (!userId) return false;
  if (task.assignee?.id === userId) return true;
  return (task.members || []).some((member) => member.id === userId);
};

export const isTaskUnassigned = (task: Task) =>
  !task.assignee && !(task.members || []).length;

const matchesDue = (
  task: Task,
  due: DueFilter,
  weekStartsOn: 0 | 1,
) => {
  if (due === "any") return true;
  const date = parseTaskDate(task.dueDate);
  if (due === "none") return !date;
  if (!date) return false;
  if (due === "today") return isToday(date);
  if (due === "week") return isThisWeek(date, { weekStartsOn });
  if (due === "overdue") {
    if (task.status === "DONE") return false;
    return isPast(startOfDay(date)) && !isToday(date);
  }
  return true;
};

export const matchesTask = (
  task: Task,
  query: BoardQuery,
  options: BoardQueryOptions,
) => {
  const search = query.search.trim().toLowerCase();
  if (search) {
    const haystack = `${task.title} ${task.description || ""}`.toLowerCase();
    if (!haystack.includes(search)) return false;
  }

  if (query.completion === "open" && task.status === "DONE") return false;
  if (query.completion === "done" && task.status !== "DONE") return false;

  if (query.assignee === "me" && !isAssignedToUser(task, options.userId)) {
    return false;
  }
  if (query.assignee === "unassigned" && !isTaskUnassigned(task)) return false;

  const weekStartsOn = options.weekStartsOn ?? 1;
  if (!matchesDue(task, query.due, weekStartsOn)) return false;

  if (
    query.priorities.length &&
    !query.priorities.includes(task.priority)
  ) {
    return false;
  }

  if (query.labelIds.length) {
    const ids = new Set((task.labels || []).map((label) => label.id));
    if (!query.labelIds.some((id) => ids.has(id))) return false;
  }

  return true;
};

export const sortTasks = (tasks: Task[], sort: BoardSort) => {
  if (sort === "board") return tasks.slice();

  const next = tasks.slice();
  next.sort((a, b) => {
    if (sort === "title") {
      return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
    }
    if (sort === "newest") {
      return (
        (parseTaskDate(b.updatedAt)?.getTime() ?? 0) -
        (parseTaskDate(a.updatedAt)?.getTime() ?? 0)
      );
    }
    if (sort === "priority") {
      return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    }
    const aDue = parseTaskDate(a.dueDate)?.getTime() ?? Number.POSITIVE_INFINITY;
    const bDue = parseTaskDate(b.dueDate)?.getTime() ?? Number.POSITIVE_INFINITY;
    if (aDue !== bDue) return aDue - bDue;
    return a.order - b.order;
  });
  return next;
};

export const filterColumnTasks = (
  tasks: Task[],
  query: BoardQuery,
  options: BoardQueryOptions,
  extraIds: string[] = [],
) => {
  const matched = tasks.filter(
    (task) =>
      extraIds.includes(task.id) || matchesTask(task, query, options),
  );
  return sortTasks(matched, query.sort);
};

export const filterBoardColumns = (
  columns: TaskColumn[],
  query: BoardQuery,
  options: BoardQueryOptions,
  extraIds: string[] = [],
) =>
  columns.map((column) => ({
    ...column,
    tasks: filterColumnTasks(column.tasks, query, options, extraIds),
  }));

export const flattenBoardTasks = (columns: TaskColumn[]) =>
  columns.flatMap((column) => column.tasks);

export const visibleDropIndex = (
  tasks: Task[],
  visible: Task[],
  visibleIndex: number,
) => {
  if (!visible.length) return Math.max(0, Math.min(visibleIndex, tasks.length));
  if (visibleIndex >= visible.length) {
    const last = visible[visible.length - 1];
    const full = tasks.findIndex((task) => task.id === last.id);
    return full === -1 ? tasks.length : full + 1;
  }
  const target = visible[Math.max(0, visibleIndex)];
  const full = tasks.findIndex((task) => task.id === target.id);
  return full === -1 ? visibleIndex : full;
};
