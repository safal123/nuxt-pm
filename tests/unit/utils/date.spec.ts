// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatDate, parseDate, relativeDate, whenDate } from "~/utils/date";

describe("parseDate", () => {
  it("parses an ISO string", () => {
    expect(parseDate("2026-03-05T12:00:00.000Z")?.toISOString()).toBe(
      "2026-03-05T12:00:00.000Z",
    );
  });

  it("returns null for an unparseable value", () => {
    expect(parseDate("not-a-date")).toBeNull();
  });
});

describe("formatDate", () => {
  it("formats with the default pattern", () => {
    expect(formatDate("2026-03-05T12:00:00.000Z")).toBe("5 Mar 2026");
  });

  it("accepts a custom pattern", () => {
    expect(formatDate("2026-03-05T12:00:00.000Z", "MMM yyyy")).toBe("Mar 2026");
  });

  it("returns null instead of throwing on bad input", () => {
    expect(formatDate("nope")).toBeNull();
  });
});

describe("relative helpers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-05T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("describes how long ago a date was", () => {
    expect(relativeDate("2026-03-05T10:00:00.000Z")).toBe("about 2 hours ago");
  });

  it("falls back to a dash for an invalid date", () => {
    expect(relativeDate("nope")).toBe("—");
  });

  it("returns a relative label plus an exact title", () => {
    const when = whenDate("2026-03-04T12:00:00.000Z");

    expect(when.label).toBe("1 day ago");
    expect(when.title).toContain("Mar 4, 2026");
  });

  it("returns an empty title for an invalid date", () => {
    expect(whenDate("nope")).toEqual({ label: "—", title: "" });
  });
});
