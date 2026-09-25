// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createError } from "h3";
import { workspaceCreateSchema } from "~/server/utils/schemas";

vi.mock("~/lib/prisma", () => ({
  default: {
    workspace: {
      create: vi.fn(),
    },
  },
}));

vi.mock("~/server/utils/billing", () => ({
  assertCanCreateWorkspace: vi.fn(),
}));

import prisma from "~/lib/prisma";
import { assertCanCreateWorkspace } from "~/server/utils/billing";
import { createWorkspace } from "~/server/utils/workspace";

const create = prisma.workspace.create as ReturnType<typeof vi.fn>;
const assertPlan = assertCanCreateWorkspace as ReturnType<typeof vi.fn>;

describe("POST /api/workspaces body", () => {
  it("requires a workspace name", () => {
    const result = workspaceCreateSchema.safeParse({ name: "  " });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("Workspace name is required");
    }
  });

  it("trims the name and empty description", () => {
    expect(
      workspaceCreateSchema.parse({
        name: "  Acme  ",
        description: "  ",
      }),
    ).toEqual({ name: "Acme", description: null });
  });

  it("rejects a name longer than 50 characters", () => {
    const result = workspaceCreateSchema.safeParse({
      name: "A".repeat(51),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "Workspace name must be 50 characters or less.",
      );
    }
  });
});

describe("createWorkspace", () => {
  beforeEach(() => {
    assertPlan.mockReset();
    create.mockReset();
  });

  it("creates the workspace with the caller as owner", async () => {
    const workspace = {
      id: "ws_1",
      name: "Acme",
      description: "Ops",
      createdBy: "user_1",
    };
    create.mockResolvedValue(workspace);

    await expect(
      createWorkspace("user_1", {
        name: "Acme",
        description: "Ops",
      }),
    ).resolves.toEqual(workspace);

    expect(assertPlan).toHaveBeenCalledWith("user_1");
    expect(create).toHaveBeenCalledWith({
      data: {
        name: "Acme",
        description: "Ops",
        createdBy: "user_1",
        members: {
          create: { userId: "user_1", role: "OWNER" },
        },
        settings: { create: {} },
      },
    });
  });

  it("stores a blank description as null", async () => {
    create.mockResolvedValue({ id: "ws_1" });

    await createWorkspace("user_1", { name: "Acme" });

    expect(create.mock.calls[0][0].data.description).toBeNull();
  });

  it("does not write when the plan limit is hit", async () => {
    assertPlan.mockRejectedValue(
      createError({
        statusCode: 402,
        message: "Free includes one workspace. Upgrade to Business for more.",
      }),
    );

    await expect(
      createWorkspace("user_1", { name: "Acme" }),
    ).rejects.toMatchObject({
      statusCode: 402,
      message: "Free includes one workspace. Upgrade to Business for more.",
    });
    expect(create).not.toHaveBeenCalled();
  });
});
