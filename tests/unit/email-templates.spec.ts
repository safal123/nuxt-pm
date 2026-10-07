import { describe, expect, it } from "vitest";
import {
  EMAIL_TEMPLATES,
  emailFooterText,
  sampleEmailHtml,
} from "~/utils/email-templates";

describe("email templates", () => {
  it("adds a Northstar footer to every sample template", () => {
    const year = new Date().getFullYear();
    const footer = emailFooterText({ workspaceName: "Northstar" });

    expect(footer).toContain("Sent for Northstar");
    expect(footer).toContain(`© ${year} Northstar. All rights reserved.`);

    for (const template of EMAIL_TEMPLATES) {
      const html = sampleEmailHtml(template.id);
      expect(html, template.id).toContain("Northstar");
      expect(html, template.id).toContain("All rights reserved");
      expect(html, template.id).toContain("Boards, activity, and email.");
    }
  });
});
