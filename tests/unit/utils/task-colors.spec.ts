// @vitest-environment node
import { describe, expect, it } from "vitest";
import { colorValue, isTaskColorId } from "~/utils/task-colors";

describe("colorValue", () => {
  it("resolves a known palette id to its hex value", () => {
    expect(colorValue("green")).toBe("#61bd4f");
  });

  it("passes through a value that is not a palette id", () => {
    expect(colorValue("#abcdef")).toBe("#abcdef");
  });
});

describe("palette membership", () => {
  it("accepts palette ids and rejects unknown ones", () => {
    expect(isTaskColorId("green")).toBe(true);
    expect(isTaskColorId("white")).toBe(false);
    expect(isTaskColorId("chartreuse")).toBe(false);
  });
});
