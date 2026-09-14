// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  ALL,
  activityChangePreview,
  activitySubject,
  activityTypeLabel,
  defaultActivityFilters,
  groupActivitiesByDate,
  isActivityKind,
  isActivityUnread,
  personInitials,
  prettyActivityValue,
  summarizeActivities,
} from "~/utils/activity";

describe("activity helpers", () => {
  it("builds default filters with ALL", () => {
    expect(defaultActivityFilters()).toEqual({
      projectId: ALL,
      taskId: ALL,
      kind: ALL,
    });
  });

  it("narrows activity kind values", () => {
    expect(isActivityKind("all")).toBe(true);
    expect(isActivityKind("task")).toBe(true);
    expect(isActivityKind("email")).toBe(true);
    expect(isActivityKind("other")).toBe(false);
  });

  it("formats initials and type labels", () => {
    expect(personInitials({ name: "Ada Lovelace", email: "ada@example.com" })).toBe(
      "AL",
    );
    expect(personInitials({ name: null, email: "lin@example.com" })).toBe("LI");
    expect(activityTypeLabel("EMAIL_SENT")).toBe("email sent");
  });

  it("treats only later teammate activity as unread", () => {
    const seen = "2026-09-14T00:00:00.000Z";
    expect(
      isActivityUnread(
        { createdAt: "2026-09-14T01:00:00.000Z", user: { id: "a" } },
        seen,
        "me",
      ),
    ).toBe(true);
    expect(
      isActivityUnread(
        { createdAt: "2026-09-14T01:00:00.000Z", user: { id: "me" } },
        seen,
        "me",
      ),
    ).toBe(false);
    expect(
      isActivityUnread(
        { createdAt: "2026-09-13T01:00:00.000Z", user: { id: "a" } },
        seen,
        "me",
      ),
    ).toBe(false);
  });

  it("summarizes counts across a feed", () => {
    const now = new Date().toISOString();
    const older = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    const summary = summarizeActivities([
      { type: "COMMENT", createdAt: now, user: { id: "a" } },
      { type: "EMAIL_SENT", createdAt: now, user: { id: "b" } },
      { type: "CREATED", createdAt: older, user: { id: "a" } },
    ]);
    expect(summary.total).toBe(3);
    expect(summary.today).toBe(2);
    expect(summary.comments).toBe(1);
    expect(summary.emails).toBe(1);
    expect(summary.people).toBe(2);
    expect(summary.thisWeek).toBeGreaterThanOrEqual(2);
  });

  it("groups events by calendar day", () => {
    const todayMorning = new Date();
    todayMorning.setHours(10, 0, 0, 0);
    const todayEvening = new Date();
    todayEvening.setHours(18, 0, 0, 0);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(10, 0, 0, 0);

    const groups = groupActivitiesByDate([
      { createdAt: todayMorning },
      { createdAt: todayEvening },
      { createdAt: yesterday },
    ]);
    expect(groups).toHaveLength(2);
    expect(groups[0].items).toHaveLength(2);
    expect(groups[1].items).toHaveLength(1);
    expect(groups[0].label).toBe("Today");
    expect(groups[1].label).toBe("Yesterday");
  });

  it("builds change previews and subjects", () => {
    expect(prettyActivityValue("IN_PROGRESS")).toBe("in progress");
    expect(
      activityChangePreview({
        type: "PRIORITY_CHANGED",
        message: "changed priority",
        metadata: { from: "LOW", to: "HIGH" },
        email: null,
      }),
    ).toEqual({
      kind: "swap",
      label: "Priority",
      from: "low",
      to: "high",
    });
    expect(
      activityChangePreview({
        type: "COMMENT",
        message: "commented",
        metadata: { content: "Ship it" },
        email: null,
      }),
    ).toEqual({ kind: "comment", text: "Ship it" });
    expect(
      activitySubject({
        email: null,
        task: { id: "t1", title: "Auth cookies" },
        project: { id: "p1", name: "Website" },
      }),
    ).toBe("Auth cookies");
  });
});
