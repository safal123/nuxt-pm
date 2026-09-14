import { format, startOfDay, subDays } from "date-fns";
import { parseDate } from "~/utils/date";
import { TASK_STATUS_IDS, statusLabel } from "~/utils/task-status";

export const ANALYTICS_DAYS = 14;

export type ActivityPoint = {
  date: string;
  Created: number;
  Completed: number;
};

export type StatusPoint = {
  name: string;
  count: number;
};

export type ProjectWorkloadPoint = {
  project: string;
  Open: number;
  Done: number;
};

export const STATUS_CHART_COLORS: Record<string, string> = {
  TODO: "hsl(215 16% 55%)",
  IN_PROGRESS: "hsl(199 89% 48%)",
  IN_REVIEW: "hsl(262.1 83.3% 58%)",
  BLOCKED: "hsl(0 72% 51%)",
  DONE: "hsl(160 81% 37%)",
};

export const analyticsDayRange = (now = new Date()) => {
  const end = startOfDay(now);
  return Array.from({ length: ANALYTICS_DAYS }, (_, index) => {
    const date = subDays(end, ANALYTICS_DAYS - 1 - index);
    return {
      key: format(date, "yyyy-MM-dd"),
      label: format(date, "MMM d"),
    };
  });
};

export const tallyByDayKey = (
  values: (Date | string | null | undefined)[],
) => {
  const counts = new Map<string, number>();
  for (const value of values) {
    if (!value) continue;
    const date = parseDate(value);
    if (!date) continue;
    const key = format(startOfDay(date), "yyyy-MM-dd");
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
};

export const buildActivitySeries = (
  createdAt: (Date | string)[],
  completedAt: (Date | string | null | undefined)[],
  now = new Date(),
): ActivityPoint[] => {
  const days = analyticsDayRange(now);
  const created = tallyByDayKey(createdAt);
  const completed = tallyByDayKey(completedAt);
  return days.map((day) => ({
    date: day.label,
    Created: created.get(day.key) ?? 0,
    Completed: completed.get(day.key) ?? 0,
  }));
};

export const buildStatusSeries = (
  groups: { status: string; count: number }[],
): StatusPoint[] => {
  const counts = new Map(groups.map((item) => [item.status, item.count]));
  return TASK_STATUS_IDS.map((status) => ({
    name: statusLabel(status),
    count: counts.get(status) ?? 0,
  })).filter((item) => item.count > 0);
};

export const statusChartColors = (points: StatusPoint[]) =>
  points.map((point) => {
    const status = TASK_STATUS_IDS.find(
      (id) => statusLabel(id) === point.name,
    );
    return STATUS_CHART_COLORS[status ?? "TODO"];
  });
