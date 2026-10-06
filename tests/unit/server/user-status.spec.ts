// @vitest-environment node
import { describe, expect, it } from "vitest";
import { userStatusSchema } from "~/server/utils/schemas";
import {
  serializeUserStatus,
  statusExpiresAt,
} from "~/server/utils/user-status";

describe("userStatusSchema", () => {
  it("accepts a preset and blank values as a clear", () => {
    expect(
      userStatusSchema.safeParse({
        availability: "offline",
        emoji: "📅",
        text: "In a meeting",
        clearAfter: "1h",
      }).success,
    ).toBe(true);

    const cleared = userStatusSchema.parse({
      availability: "online",
      emoji: "",
      text: "  ",
      clearAfter: "never",
    });
    expect(cleared).toMatchObject({
      availability: "online",
      emoji: null,
      text: null,
      clearAfter: "never",
    });
  });

  it("rejects an unknown duration", () => {
    expect(
      userStatusSchema.safeParse({
        availability: "online",
        emoji: null,
        text: null,
        clearAfter: "2h",
      }).success,
    ).toBe(false);
  });
});

describe("serializeUserStatus", () => {
  it("defaults to online with no message", () => {
    expect(serializeUserStatus(null)).toEqual({
      availability: "online",
      emoji: "",
      text: "",
      clearAfter: "never",
      expiresAt: null,
    });
  });
});

describe("statusExpiresAt", () => {
  it("leaves never without an expiry", () => {
    expect(statusExpiresAt("never")).toBeNull();
  });

  it("sets a timestamp for 30m", () => {
    const expires = statusExpiresAt("30m");
    expect(expires).toBeInstanceOf(Date);
    expect(expires!.getTime()).toBeGreaterThan(Date.now());
  });
});
