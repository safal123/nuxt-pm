// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  colorValue,
  isTaskColorId,
  isWorkspaceColorId,
  hasWorkspaceTint,
  workspaceThemeCss,
  workspaceThemeVars,
} from "~/utils/task-colors";

describe("colorValue", () => {
  it("resolves a known palette id to its hex value", () => {
    expect(colorValue("green")).toBe("#61bd4f");
  });

  it("passes through a value that is not a palette id", () => {
    expect(colorValue("#abcdef")).toBe("#abcdef");
  });
});

describe("palette membership", () => {
  it("treats white as a workspace colour but not a task colour", () => {
    expect(isWorkspaceColorId("white")).toBe(true);
    expect(isTaskColorId("white")).toBe(false);
  });

  it("rejects unknown ids", () => {
    expect(isWorkspaceColorId("chartreuse")).toBe(false);
  });
});

describe("hasWorkspaceTint", () => {
  it("reports no tint for white and unset workspaces", () => {
    expect(hasWorkspaceTint("white")).toBe(false);
    expect(hasWorkspaceTint(null)).toBe(false);
  });

  it("reports a tint for a palette colour", () => {
    expect(hasWorkspaceTint("green")).toBe(true);
  });
});

describe("workspaceThemeVars", () => {
  it("falls back to neutral action colours when no colour is chosen", () => {
    const vars = workspaceThemeVars("white");

    expect(vars).toMatchObject({
      "--primary-color": "hsl(var(--foreground))",
      "--primary-foreground-color": "hsl(var(--background))",
    });
  });

  it("omits the tint inputs for white so the CSS ramp stays inactive", () => {
    const vars = workspaceThemeVars("white");

    expect(vars).not.toHaveProperty("--ws-hue");
    expect(vars).not.toHaveProperty("--ws-chroma");
    expect(vars).not.toHaveProperty("--ws-lift");
    expect(vars).not.toHaveProperty("--dropzone-border-color");
  });

  it("publishes the workspace hue so CSS can build the surface ramp", () => {
    expect(workspaceThemeVars("blue")).toMatchObject({
      "--ws-hue": "245.0",
      "--primary-color": "#0079bf",
    });
    expect(workspaceThemeVars("green")).toMatchObject({ "--ws-hue": "140.5" });
  });

  it("runs a saturated colour at full intensity", () => {
    expect(workspaceThemeVars("green")).toMatchObject({ "--ws-chroma": "1.000" });
  });

  it("scales the ramp down so a muted colour stays near-neutral", () => {
    const chroma = Number(workspaceThemeVars("black")["--ws-chroma"]);

    expect(chroma).toBeGreaterThan(0);
    expect(chroma).toBeLessThan(0.5);
  });

  it("lifts the ramp for a naturally light hue but not a dark one", () => {
    const lift = (id: string) =>
      Number.parseFloat(workspaceThemeVars(id)["--ws-lift"]);

    expect(lift("yellow")).toBeGreaterThan(lift("green"));
    expect(lift("green")).toBeGreaterThan(lift("blue"));
    expect(lift("blue")).toBe(0);
  });

  it("caps the lift so no colour can wash the ramp out", () => {
    for (const id of ["yellow", "lime", "orange", "sky", "pink", "white"]) {
      const raw = workspaceThemeVars(id)["--ws-lift"];
      if (raw) expect(Number.parseFloat(raw)).toBeLessThanOrEqual(5.5);
    }
  });

  it("outlines the drop zone with the raw colour", () => {
    expect(workspaceThemeVars("blue")).toMatchObject({
      "--dropzone-border-color": "#0079bf",
    });
  });

  it("picks a readable foreground for light and dark workspace colours", () => {
    expect(workspaceThemeVars("yellow")).toMatchObject({
      "--primary-foreground-color": "#1a1a1a",
    });
    expect(workspaceThemeVars("black")).toMatchObject({
      "--primary-foreground-color": "#ffffff",
    });
  });
});

describe("workspaceThemeCss", () => {
  it("serialises the variables into an inline style declaration", () => {
    const css = workspaceThemeCss("green");

    expect(css).toContain("--ws-hue: 140.5");
    expect(css).toContain("--primary-color: #61bd4f");
  });
});
