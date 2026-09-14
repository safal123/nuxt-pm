// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  boardRealtime,
  projectChannel,
  userChannel,
  userRealtime,
  workspaceChannel,
  workspaceRealtime,
} from "~/utils/realtime";

describe("realtime channels", () => {
  it("scopes traffic by project, workspace, and user", () => {
    expect(projectChannel("abc")).toBe("project:abc");
    expect(workspaceChannel("ws")).toBe("workspace:ws");
    expect(userChannel("u1")).toBe("user:u1");
  });

  it("builds a board publish envelope", () => {
    expect(boardRealtime("abc", { type: "board.refresh" })).toEqual({
      channel: "project:abc",
      event: { type: "board.refresh" },
    });
  });

  it("builds a workspace publish envelope", () => {
    expect(
      workspaceRealtime("ws", { type: "email.sent", id: "mail-1" }),
    ).toEqual({
      channel: "workspace:ws",
      event: { type: "email.sent", id: "mail-1" },
    });
  });

  it("builds a user publish envelope", () => {
    expect(
      userRealtime("u1", { type: "notification.created", id: "n1" }),
    ).toEqual({
      channel: "user:u1",
      event: { type: "notification.created", id: "n1" },
    });
  });
});
