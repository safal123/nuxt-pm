// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  ALL,
  activityTypeLabel,
  defaultActivityFilters,
  isActivityKind,
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
});
