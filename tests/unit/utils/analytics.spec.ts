// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  analyticsDayRange,
  buildActivitySeries,
  buildStatusSeries,
  statusChartColors,
} from "~/utils/analytics";

describe("analytics helpers", () => {
  it("builds fourteen consecutive day labels", () => {
    const days = analyticsDayRange(new Date(2026, 8, 14, 15));
    expect(days).toHaveLength(14);
    expect(days[0]?.key).toBe("2026-09-01");
    expect(days[13]?.key).toBe("2026-09-14");
  });

  it("counts created and completed cards into the day series", () => {
    const series = buildActivitySeries(
      [new Date(2026, 8, 14, 10), new Date(2026, 8, 14, 18)],
      [new Date(2026, 8, 13, 12), null],
      new Date(2026, 8, 14, 20),
    );
    expect(series[13]).toMatchObject({
      date: "Sep 14",
      Created: 2,
      Completed: 0,
    });
    expect(series[12]).toMatchObject({
      date: "Sep 13",
      Created: 0,
      Completed: 1,
    });
  });

  it("keeps only statuses that have cards", () => {
    const points = buildStatusSeries([
      { status: "TODO", count: 4 },
      { status: "DONE", count: 2 },
      { status: "BLOCKED", count: 0 },
    ]);
    expect(points).toEqual([
      { name: "To do", count: 4 },
      { name: "Done", count: 2 },
    ]);
    expect(statusChartColors(points)).toHaveLength(2);
  });
});
