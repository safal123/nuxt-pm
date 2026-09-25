// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createError } from "h3";
import { projectCreateSchema } from "~/server/utils/schemas";

vi.mock("~/lib/prisma", () => ({
  default: {
    project: {
      create: vi.fn(),
    },
  },
}));

vi.mock("~/server/utils/billing", () => ({
  assertCanCreateProject: vi.fn(),
}));

vi.mock("~/server/utils/column", () => ({
  createDefaultColumns: vi.fn(),
}));

import prisma from "~/lib/prisma";
import { assertCanCreateProject } from "~/server/utils/billing";
import { createDefaultColumns } from "~/server/utils/column";
import { createProject } from "~/server/utils/project";

const create = prisma.project.create as ReturnType<typeof vi.fn>;
const assertPlan = assertCanCreateProject as ReturnType<typeof vi.fn>;
const defaultColumns = createDefaultColumns as ReturnType<typeof vi.fn>;

describe("POST /api/projects body", () => {
  it("requires a project name", () => {
    const result = projectCreateSchema.safeParse({
      workspaceId: "ws_1",
      name: "  ",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("Project name is required");
    }
  });
});

describe("createProject", () => {
  beforeEach(() => {
    assertPlan.mockReset();
    create.mockReset();
    defaultColumns.mockReset();
  });

  it("creates the project with the caller as owner and default lists", async () => {
    const project = {
      id: "p_1",
      name: "Website",
      workspaceId: "ws_1",
      createdBy: "user_1",
    };
    create.mockResolvedValue(project);

    await expect(
      createProject({
        workspaceId: "ws_1",
        name: "Website",
        description: "Launch",
        createdBy: "user_1",
      }),
    ).resolves.toEqual(project);

    expect(assertPlan).toHaveBeenCalledWith("ws_1");
    expect(create).toHaveBeenCalledWith({
      data: {
        workspaceId: "ws_1",
        name: "Website",
        description: "Launch",
        createdBy: "user_1",
        members: {
          create: {
            userId: "user_1",
            role: "OWNER",
            workspaceId: "ws_1",
          },
        },
      },
    });
    expect(defaultColumns).toHaveBeenCalledWith("p_1", "ws_1");
  });

  it("does not write when the plan limit is hit", async () => {
    assertPlan.mockRejectedValue(
      createError({
        statusCode: 402,
        message: "Free includes 3 projects. Archive one or upgrade to Team for unlimited projects.",
      }),
    );

    await expect(
      createProject({
        workspaceId: "ws_1",
        name: "Website",
        createdBy: "user_1",
      }),
    ).rejects.toMatchObject({ statusCode: 402 });
    expect(create).not.toHaveBeenCalled();
  });

  it("returns 409 when the workspace already has that project name", async () => {
    create.mockRejectedValue({ code: "P2002" });

    await expect(
      createProject({
        workspaceId: "ws_1",
        name: "Website",
        createdBy: "user_1",
      }),
    ).rejects.toMatchObject({
      statusCode: 409,
      message: "A project with that name already exists in this workspace.",
    });
    expect(defaultColumns).not.toHaveBeenCalled();
  });
});
