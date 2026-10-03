// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  dayKey,
  eventDayKeys,
  layoutTimedEvents,
  monthGrid,
  shiftEventToDay,
  timeSlots,
  visibleRange,
  weekDays,
} from "../../../utils/calendar";

const local = (y: number, m: number, d: number, h = 0, min = 0) =>
  new Date(y, m - 1, d, h, min).toISOString();

describe("calendar grids", () => {
  it("builds a 6-week month grid from the week start", () => {
    const days = monthGrid(new Date(2026, 9, 15), 1);
    expect(days).toHaveLength(42);
    expect(dayKey(days[0])).toBe("2026-09-28");
    expect(days[0].getDay()).toBe(1);
  });

  it("respects a Sunday week start", () => {
    const days = weekDays(new Date(2026, 9, 7), 0);
    expect(dayKey(days[0])).toBe("2026-10-04");
    expect(dayKey(days[6])).toBe("2026-10-10");
  });

  it("returns a half-open range for each mode", () => {
    const week = visibleRange("week", new Date(2026, 9, 7), 1);
    expect(dayKey(week.from)).toBe("2026-10-05");
    expect(dayKey(week.to)).toBe("2026-10-12");
    const agenda = visibleRange("agenda", new Date(2026, 9, 7, 15), 1);
    expect(dayKey(agenda.from)).toBe("2026-10-07");
    expect(dayKey(agenda.to)).toBe("2026-11-06");
  });

  it("offers half-hour slots", () => {
    const slots = timeSlots();
    expect(slots).toHaveLength(48);
    expect(slots[19]).toEqual({ value: "09:30", label: "9:30 AM" });
  });
});

describe("eventDayKeys", () => {
  it("reads all-day events as UTC date ranges", () => {
    expect(
      eventDayKeys({
        allDay: true,
        startAt: "2026-10-05T00:00:00.000Z",
        endAt: "2026-10-07T00:00:00.000Z",
      }),
    ).toEqual(["2026-10-05", "2026-10-06", "2026-10-07"]);
  });

  it("stops a timed event that ends at midnight on the previous day", () => {
    expect(
      eventDayKeys({
        allDay: false,
        startAt: local(2026, 10, 5, 22),
        endAt: local(2026, 10, 6, 0),
      }),
    ).toEqual(["2026-10-05"]);
  });

  it("spans overnight timed events", () => {
    expect(
      eventDayKeys({
        allDay: false,
        startAt: local(2026, 10, 5, 22),
        endAt: local(2026, 10, 6, 2),
      }),
    ).toEqual(["2026-10-05", "2026-10-06"]);
  });
});

describe("layoutTimedEvents", () => {
  const day = new Date(2026, 9, 5);
  const event = (id: string, start: number, end: number) => ({
    id,
    startAt: local(2026, 10, 5, start),
    endAt: local(2026, 10, 5, end),
  });

  it("splits overlapping events into columns", () => {
    const layout = layoutTimedEvents(
      [event("a", 9, 11), event("b", 10, 12), event("c", 13, 14)],
      day,
    );
    const byId = Object.fromEntries(layout.map((slot) => [slot.item.id, slot]));
    expect(byId.a).toMatchObject({ top: 540, height: 120, column: 0, columns: 2 });
    expect(byId.b).toMatchObject({ column: 1, columns: 2 });
    expect(byId.c).toMatchObject({ column: 0, columns: 1 });
  });

  it("reuses a freed column inside the same cluster", () => {
    const layout = layoutTimedEvents(
      [event("a", 9, 12), event("b", 9, 10), event("c", 10, 11)],
      day,
    );
    const byId = Object.fromEntries(layout.map((slot) => [slot.item.id, slot]));
    expect(byId.c.column).toBe(1);
    expect(byId.a.columns).toBe(2);
  });
});

describe("shiftEventToDay", () => {
  it("keeps the time and duration of timed events", () => {
    const next = shiftEventToDay(
      { allDay: false, startAt: local(2026, 10, 5, 9, 30), endAt: local(2026, 10, 5, 11) },
      "2026-10-08",
    );
    expect(next).toEqual({ startAt: local(2026, 10, 8, 9, 30), endAt: local(2026, 10, 8, 11) });
  });

  it("moves multi-day all-day events as a block", () => {
    const next = shiftEventToDay(
      { allDay: true, startAt: "2026-10-05T00:00:00.000Z", endAt: "2026-10-06T00:00:00.000Z" },
      "2026-10-12",
    );
    expect(next).toEqual({ startAt: "2026-10-12", endAt: "2026-10-13" });
  });
});
