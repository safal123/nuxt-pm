import { addDays, format, parseISO } from "date-fns";
import type { Sprint, SprintFilter, SprintStatus, SprintView } from "~/types";

export const SPRINT_STATUSES = [
  "PLANNED",
  "ACTIVE",
  "COMPLETED",
  "CANCELLED",
] as const satisfies readonly SprintStatus[];

export const isHistoricSprint = (status: SprintStatus) =>
  status === "COMPLETED" || status === "CANCELLED";

export const nextSprintNumber = (sprints: { number?: number; name?: string }[]) => {
  const numbers = sprints
    .map((sprint) => sprint.number)
    .filter((value): value is number => Number.isInteger(value));
  if (numbers.length) return Math.max(...numbers) + 1;
  return sprints.length + 1;
};

export const sprintTitle = (number: number) => `Sprint ${number}`;

export const defaultSprintDates = () => {
  const start = new Date();
  start.setHours(12, 0, 0, 0);
  const end = addDays(start, 13);
  return {
    plannedStartAt: format(start, "yyyy-MM-dd"),
    plannedEndAt: format(end, "yyyy-MM-dd"),
  };
};

export const resolveSprintFilter = (
  view: SprintView,
  current: { id: string } | null,
  sprintCount: number,
): SprintFilter => {
  if (view === "backlog") return { type: "backlog" };
  if (view !== "current") return { type: "sprint", sprintId: view };
  if (current) return { type: "sprint", sprintId: current.id };
  if (sprintCount > 0) return { type: "backlog" };
  return { type: "all" };
};

export const sprintWhere = (filter: SprintFilter) => {
  if (filter.type === "all") return undefined;
  if (filter.type === "backlog") return { sprintId: null };
  return { sprintId: filter.sprintId };
};

export const taskMatchesSprint = (
  task: { sprintId?: string | null },
  filter: SprintFilter,
) => {
  if (filter.type === "all") return true;
  if (filter.type === "backlog") return !task.sprintId;
  return task.sprintId === filter.sprintId;
};

export const sprintRangeLabel = (sprint: {
  plannedStartAt?: Date | string | null;
  plannedEndAt?: Date | string | null;
}) => {
  const start = parseSprintDate(sprint.plannedStartAt);
  const end = parseSprintDate(sprint.plannedEndAt);
  if (!start && !end) return null;
  if (start && end) return `${format(start, "MMM d")} – ${format(end, "MMM d")}`;
  if (start) return `From ${format(start, "MMM d")}`;
  return `Until ${format(end as Date, "MMM d")}`;
};

export const sprintStatusLabel = (status: Sprint["status"]) => {
  if (status === "ACTIVE") return "Current";
  if (status === "COMPLETED") return "Completed";
  if (status === "CANCELLED") return "Cancelled";
  return "Planned";
};

export const toSprintInputDate = (value: Date | string | null | undefined) => {
  const date = parseSprintDate(value);
  return date ? format(date, "yyyy-MM-dd") : "";
};

const parseSprintDate = (value: Date | string | null | undefined) => {
  if (!value) return null;
  const date = typeof value === "string" ? parseISO(value) : value;
  return Number.isNaN(date.getTime()) ? null : date;
};
