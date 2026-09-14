// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  ALL,
  activityTypeLabel,
  defaultActivityFilters,
  isActivityKind,
  isActivityUnread,
  personInitials,
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
});
