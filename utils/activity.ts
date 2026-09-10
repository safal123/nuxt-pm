import type {
  ActivityFilters,
  ActivityKindFilter,
  ActivityType,
  TaskAssignee,
} from "~/types";

export const ALL = "all";
export const ACTIVITY_PAGE_SIZE = 12;

export const defaultActivityFilters = (): ActivityFilters => ({
  projectId: ALL,
  taskId: ALL,
  kind: ALL,
});

export const isActivityKind = (value: string): value is ActivityKindFilter =>
  value === ALL || value === "task" || value === "email";

export const personInitials = (person: Pick<TaskAssignee, "name" | "email">) => {
  const name = person.name || person.email || "";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase() || "?";
};

export const activityTypeLabel = (type: ActivityType | string) =>
  String(type).replace(/_/g, " ").toLowerCase();
