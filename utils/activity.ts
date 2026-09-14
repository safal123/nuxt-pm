import { format, isToday, isYesterday, startOfDay, subDays } from "date-fns";
import type {
  ActivityFilters,
  ActivityKindFilter,
  ActivitySummary,
  ActivityType,
  TaskAssignee,
  WorkspaceActivity,
} from "~/types";
import { parseDate } from "~/utils/date";

export const ALL = "all";
export const ACTIVITY_PAGE_SIZE = 20;
export const ACTIVITY_TIMELINE_LIMIT = 200;

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

export const NOTIFICATION_SEEN_KEY = (workspaceId: string) =>
  `ns-activity-seen:${workspaceId}`;

export const isActivityUnread = (
  activity: { createdAt: Date | string; user: { id: string } },
  lastSeenAt: string | null,
  userId?: string | null,
) => {
  if (userId && activity.user.id === userId) return false;
  if (!lastSeenAt) return true;
  return new Date(activity.createdAt).getTime() > new Date(lastSeenAt).getTime();
};

export const emptyActivitySummary = (): ActivitySummary => ({
  total: 0,
  today: 0,
  thisWeek: 0,
  comments: 0,
  emails: 0,
  people: 0,
});

export const summarizeActivities = (
  activities: {
    type: string;
    createdAt: Date | string;
    user: { id: string };
  }[],
): ActivitySummary => {
  const startToday = startOfDay(new Date()).getTime();
  const startWeek = startOfDay(subDays(new Date(), 6)).getTime();
  const actors = new Set<string>();
  const summary = emptyActivitySummary();
  summary.total = activities.length;

  for (const item of activities) {
    actors.add(item.user.id);
    const time = new Date(item.createdAt).getTime();
    if (!Number.isNaN(time)) {
      if (time >= startToday) summary.today += 1;
      if (time >= startWeek) summary.thisWeek += 1;
    }
    if (item.type === "COMMENT") summary.comments += 1;
    if (item.type === "EMAIL_SENT" || item.type === "EMAIL_FAILED") {
      summary.emails += 1;
    }
  }

  summary.people = actors.size;
  return summary;
};

export const activityDateGroupLabel = (value: Date | string) => {
  const date = parseDate(value);
  if (!date) return "Unknown date";
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "EEEE, MMM d, yyyy");
};

export const groupActivitiesByDate = <T extends { createdAt: Date | string }>(
  activities: T[],
) => {
  const groups: { key: string; label: string; items: T[] }[] = [];
  const index = new Map<string, number>();

  for (const activity of activities) {
    const date = parseDate(activity.createdAt);
    const key = date ? format(date, "yyyy-MM-dd") : "unknown";
    const existing = index.get(key);
    if (existing != null) {
      groups[existing].items.push(activity);
      continue;
    }
    index.set(key, groups.length);
    groups.push({
      key,
      label: activityDateGroupLabel(activity.createdAt),
      items: [activity],
    });
  }

  return groups;
};

export const prettyActivityValue = (value: unknown) => {
  if (value == null || value === "") return null;
  if (typeof value === "boolean" || typeof value === "number") return String(value);
  if (typeof value !== "string") return null;
  if (/^[A-Z0-9_]+$/.test(value)) return value.replace(/_/g, " ").toLowerCase();
  return value;
};

export const activityChangeLabel = (type: ActivityType | string) => {
  if (type === "TITLE_CHANGED") return "Title";
  if (type === "PRIORITY_CHANGED") return "Priority";
  if (type === "STATUS_CHANGED" || type === "COMPLETED" || type === "REOPENED") {
    return "Status";
  }
  if (type === "MOVED") return "List";
  if (type === "COVER_CHANGED") return "Cover";
  if (type === "DESCRIPTION_CHANGED") return "Description";
  return "Changed";
};

const dateFieldLabel = (field: string) => {
  const value = field.toLowerCase();
  if (value.includes("start")) return "Start";
  if (value.includes("due")) return "Due";
  if (value.includes("end")) return "End";
  return field.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase());
};

export const activityDateChanges = (activity: {
  type: string;
  message: string;
  metadata: Record<string, unknown> | null;
}) => {
  const raw = activity.metadata?.changes;
  if (Array.isArray(raw)) {
    return raw
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const row = item as { field?: string; from?: string | null; to?: string | null };
        if (!row.field) return null;
        return {
          field: dateFieldLabel(row.field),
          from: row.from || null,
          to: row.to || null,
        };
      })
      .filter(Boolean) as { field: string; from: string | null; to: string | null }[];
  }

  if (activity.type !== "DATES_UPDATED") return [];
  return activity.message
    .split(", ")
    .filter(Boolean)
    .map((line) => ({ field: "Date", from: null as string | null, to: line }));
};

export type ActivityChangePreview =
  | { kind: "comment"; text: string }
  | { kind: "swap"; label: string; from: string | null; to: string | null }
  | {
      kind: "dates";
      changes: { field: string; from: string | null; to: string | null }[];
    }
  | { kind: "note"; text: string };

export const activityChangePreview = (
  activity: Pick<WorkspaceActivity, "type" | "message" | "metadata" | "email">,
): ActivityChangePreview | null => {
  if (activity.type === "COMMENT") {
    const content = activity.metadata?.content;
    if (typeof content === "string" && content.trim()) {
      return { kind: "comment", text: content };
    }
  }

  const dates = activityDateChanges(activity);
  if (dates.length) return { kind: "dates", changes: dates };

  const from = prettyActivityValue(activity.metadata?.from);
  const to = prettyActivityValue(activity.metadata?.to);
  if (from != null || to != null) {
    return {
      kind: "swap",
      label: activityChangeLabel(activity.type),
      from,
      to,
    };
  }

  if (activity.email) {
    return {
      kind: "note",
      text: `${activity.email.toEmail} · ${activity.email.subject}`,
    };
  }

  return null;
};

export const activitySubject = (
  activity: Pick<WorkspaceActivity, "email" | "task" | "project">,
) =>
  activity.email?.subject ||
  activity.task?.title ||
  activity.project?.name ||
  null;
