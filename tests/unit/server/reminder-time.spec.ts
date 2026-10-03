// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  digestTarget,
  isValidTimeZone,
  nextDayKey,
  zonedDayKey,
  zonedDayRange,
} from "../../../server/utils/reminder-time";

describe("reminder time zones", () => {
  it("validates IANA zones", () => {
    expect(isValidTimeZone("Australia/Sydney")).toBe(true);
    expect(isValidTimeZone("Mars/Olympus")).toBe(false);
  });

  it("reads the local day in a zone", () => {
    const instant = new Date("2026-10-04T22:00:00Z");
    expect(zonedDayKey(instant, "Australia/Sydney")).toBe("2026-10-05");
    expect(zonedDayKey(instant, "America/New_York")).toBe("2026-10-04");
  });

  it("rolls month ends", () => {
    expect(nextDayKey("2026-10-31")).toBe("2026-11-01");
  });

  it("finds local midnight across a DST change", () => {
    // Sydney moves from +10 to +11 on 4 Oct 2026.
    const before = zonedDayRange("2026-10-03", "Australia/Sydney");
    expect(before.start.toISOString()).toBe("2026-10-02T14:00:00.000Z");
    const after = zonedDayRange("2026-10-05", "Australia/Sydney");
    expect(after.start.toISOString()).toBe("2026-10-04T13:00:00.000Z");
    expect(after.end.toISOString()).toBe("2026-10-05T13:00:00.000Z");
  });

  it("previews tomorrow from 9am local, today before that", () => {
    const daily = new Date("2026-10-04T22:00:00Z");
    expect(digestTarget(daily, "Australia/Sydney")).toEqual({
      forDate: "2026-10-06",
      when: "tomorrow",
    });
    expect(digestTarget(daily, "Asia/Kolkata")).toEqual({
      forDate: "2026-10-05",
      when: "today",
    });
    expect(digestTarget(daily, "America/Los_Angeles")).toEqual({
      forDate: "2026-10-05",
      when: "tomorrow",
    });
  });
});
