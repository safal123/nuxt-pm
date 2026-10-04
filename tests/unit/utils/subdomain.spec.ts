// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  normalizeAppDomain,
  apexOrigin,
  appCookieDomain,
  slugifySubdomain,
  subdomainError,
  subdomainFromHost,
  subdomainOrigin,
} from "~/utils/subdomain";
import { subdomainSchema } from "~/server/utils/schemas";

describe("subdomain helpers", () => {
  it("accepts valid labels and normalizes case", () => {
    expect(subdomainError("john")).toBeNull();
    expect(subdomainError("John-2")).toBeNull();
    expect(subdomainSchema.parse(" John ")).toBe("john");
  });

  it("rejects bad labels", () => {
    expect(subdomainError("jo")).toMatch(/at least/);
    expect(subdomainError("-john")).toMatch(/hyphens/);
    expect(subdomainError("john_doe")).toMatch(/hyphens/);
    expect(subdomainError("a".repeat(31))).toMatch(/or less/);
    expect(subdomainError("www")).toMatch(/reserved/);
    expect(subdomainSchema.safeParse("api").success).toBe(false);
  });

  it("slugifies names and emails", () => {
    expect(slugifySubdomain("John Smith")).toBe("john-smith");
    expect(slugifySubdomain("josé@example.com")).toBe("jose");
    expect(slugifySubdomain("Al")).toBe("al-team");
    expect(slugifySubdomain("www")).toBe("www-team");
    expect(subdomainError(slugifySubdomain("x".repeat(60)))).toBeNull();
  });

  it("reads the tenant from a host", () => {
    expect(subdomainFromHost("john.workflow.com", "workflow.com")).toBe("john");
    expect(subdomainFromHost("john.lvh.me:3000", "lvh.me:3000")).toBe("john");
    expect(subdomainFromHost("workflow.com", "workflow.com")).toBeNull();
    expect(subdomainFromHost("a.b.workflow.com", "workflow.com")).toBeNull();
    expect(subdomainFromHost("evilworkflow.com", "workflow.com")).toBeNull();
    expect(subdomainFromHost("john.workflow.com", "")).toBeNull();
  });

  it("builds origins", () => {
    expect(subdomainOrigin("john", "workflow.com", "https")).toBe("https://john.workflow.com");
    expect(subdomainOrigin("john", "lvh.me:3000", "http:")).toBe("http://john.lvh.me:3000");
    expect(apexOrigin("workflow.com", "https")).toBe("https://workflow.com");
    expect(appCookieDomain("lvh.me:3000")).toBe("lvh.me");
  });
});

describe("normalizeAppDomain", () => {
  it("accepts a bare host or a pasted URL", () => {
    expect(normalizeAppDomain("workflow.com")).toBe("workflow.com");
    expect(normalizeAppDomain(" https://Workflow.com/ ")).toBe("workflow.com");
    expect(normalizeAppDomain("http://lvh.me:3000")).toBe("lvh.me:3000");
  });

  it("turns subdomains off for hosts without wildcard support", () => {
    expect(normalizeAppDomain("https://nuxt-pm.vercel.app")).toBe("");
    expect(normalizeAppDomain(undefined)).toBe("");
  });
});
