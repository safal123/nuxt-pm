// @vitest-environment node
import { describe, expect, it } from "vitest";
import { projectSettingsSchema } from "~/server/utils/schemas";
import { serializeProjectSettings } from "~/server/utils/project";

describe("projectSettingsSchema", () => {
  it("accepts a view and rejects an empty patch", () => {
    expect(projectSettingsSchema.safeParse({ defaultView: "calendar" }).success).toBe(true);
    expect(projectSettingsSchema.safeParse({}).success).toBe(false);
    expect(projectSettingsSchema.safeParse({ defaultView: "agenda" }).success).toBe(false);
  });
});

describe("serializeProjectSettings", () => {
  it("falls back to board when the stored view is missing or unknown", () => {
    expect(serializeProjectSettings(null)).toEqual({ defaultView: "board" });
    expect(serializeProjectSettings({ defaultView: "weird" })).toEqual({ defaultView: "board" });
    expect(serializeProjectSettings({ defaultView: "table" })).toEqual({ defaultView: "table" });
  });
});
