import { format, formatDistanceToNow, parseISO } from "date-fns";

export const parseDate = (value: Date | string) => {
  const date = typeof value === "string" ? parseISO(value) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const formatDate = (value: Date | string, pattern = "d MMM yyyy") => {
  const date = parseDate(value);
  return date ? format(date, pattern) : null;
};

export const relativeDate = (value: Date | string) => {
  const date = parseDate(value);
  if (!date) return "—";
  return formatDistanceToNow(date, { addSuffix: true });
};

export const whenDate = (value: Date | string) => {
  const date = parseDate(value);
  if (!date) return { label: "—", title: "" };
  return {
    label: formatDistanceToNow(date, { addSuffix: true }),
    title: format(date, "MMM d, yyyy 'at' h:mm a"),
  };
};
