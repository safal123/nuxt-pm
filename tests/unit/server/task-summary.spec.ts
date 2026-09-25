// @vitest-environment node
import { describe, expect, it } from "vitest";
import { buildPrompt, fallbackSummary, parseSummaryJson } from "~/server/utils/task-summary";
import {
  isSummaryLimitedToday,
  summaryBullets,
  wasGeneratedToday,
} from "~/utils/ai-summary";

describe("parseSummaryJson", () => {
  it("reads progress and furtherAction", () => {
    expect(
      parseSummaryJson(
        '{"progress":"Work is underway.","furtherAction":"Ask for a review."}',
      ),
    ).toEqual({
      progress: "Work is underway.",
      furtherAction: "Ask for a review.",
    });
  });

  it("reads fenced JSON and further_action", () => {
    expect(
      parseSummaryJson(
        '```json\n{"progress":"In review.","further_action":"Merge after approval."}\n```',
      ),
    ).toEqual({
      progress: "In review.",
      furtherAction: "Merge after approval.",
    });
  });

  it("joins arrays into one bullet per line and strips bullet symbols", () => {
    expect(
      parseSummaryJson(
        '{"progress":["- Ready for review","• Tests pass"],"furtherAction":["1. Maya: review the PR","2) Merge after approval"]}',
      ),
    ).toEqual({
      progress: "Ready for review\nTests pass",
      furtherAction: "Maya: review the PR\nMerge after approval",
    });
  });

  it("splits an old paragraph summary into bullets", () => {
    expect(
      summaryBullets("Login is broken on Safari. Ada is testing a fix."),
    ).toEqual(["Login is broken on Safari.", "Ada is testing a fix."]);
  });

  it("ignores credit errors and empty payloads", () => {
    expect(
      parseSummaryJson("The account behind this API key doesn't have enough credits."),
    ).toBeNull();
    expect(parseSummaryJson("not json")).toBeNull();
  });
});

describe("fallbackSummary", () => {
  it("writes progress and a next step from the card", () => {
    const summary = fallbackSummary({
      title: "Fix login",
      description: null,
      status: "IN_PROGRESS",
      priority: "HIGH",
      projectName: "Website",
      columnName: "In Progress",
      sprintName: null,
      sprintStatus: null,
      dueDate: null,
      createdAt: null,
      completedAt: null,
      creator: "Ada",
      members: ["Ada"],
      labels: [],
      attachments: [],
      comments: [
        { at: "Mar 1, 2026 12:00 PM", author: "Ada", content: "Safari still fails." },
      ],
      activities: [],
      previous: {
        progress: "Login was still broken on Safari.",
        furtherAction: "Reproduce on Safari.",
        generatedAt: "Mar 1, 2026 10:00 AM",
      },
    });

    expect(summary.progress.split("\n")).toContain("Ada: Safari still fails.");
    expect(summary.progress.split("\n").length).toBeGreaterThan(1);
    expect(summary.furtherAction.split("\n").length).toBeGreaterThan(1);
  });
});

describe("buildPrompt", () => {
  it("includes the previous summary and chronological comments", () => {
    const prompt = buildPrompt({
      title: "Fix login",
      description: "Safari users cannot sign in.",
      status: "IN_PROGRESS",
      priority: "HIGH",
      projectName: "Website",
      columnName: "In Progress",
      sprintName: "Sprint 3",
      sprintStatus: "ACTIVE",
      dueDate: "2026-03-10",
      createdAt: "2026-03-01T12:00:00.000Z",
      completedAt: null,
      creator: "Ada",
      members: ["Ada"],
      labels: ["bug"],
      attachments: [{ name: "repro.mp4", uploader: "Ada" }],
      comments: [
        { at: "Mar 1, 2026 12:00 PM", author: "Ada", content: "Safari still fails." },
      ],
      activities: [
        {
          at: "Mar 1, 2026 11:00 AM",
          actor: "Ada",
          type: "CREATED",
          message: "created this card",
          detail: null,
        },
      ],
      previous: {
        progress: "Login was still broken on Safari.",
        furtherAction: "Reproduce on Safari.",
        generatedAt: "Mar 1, 2026 10:00 AM",
      },
    });

    expect(prompt).toContain("Previous summary");
    expect(prompt).toContain("Login was still broken on Safari.");
    expect(prompt).toContain("Safari still fails.");
    expect(prompt).toContain("repro.mp4");
    expect(prompt).toContain("Sprint 3");
  });
});

describe("wasGeneratedToday", () => {
  it("is true for a summary created today and false for yesterday", () => {
    expect(wasGeneratedToday(new Date())).toBe(true);
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    expect(wasGeneratedToday(yesterday)).toBe(false);
    expect(wasGeneratedToday(null)).toBe(false);
  });

  it("does not limit pokharelsafal66@gmail.com", () => {
    expect(isSummaryLimitedToday(new Date(), "pokharelsafal66@gmail.com")).toBe(
      false,
    );
    expect(isSummaryLimitedToday(new Date(), "other@example.com")).toBe(true);
  });
});
