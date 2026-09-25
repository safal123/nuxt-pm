import { describe, expect, it } from "vitest";
import { parseChatMarkdown, parseInline } from "~/utils/chat-markdown";

describe("parseChatMarkdown", () => {
  it("groups bullets into one list and keeps paragraphs", () => {
    const blocks = parseChatMarkdown(
      'Two cards need attention.\n\n- **"Weekly time export"** (In progress) — Priya\n- **Invoice PDF template** — overdue\n\nTip: check the lists.',
    );
    expect(blocks.map((block) => block.type)).toEqual(["paragraph", "list", "paragraph"]);
    const list = blocks[1];
    expect(list.type === "list" && list.items.length).toBe(2);
  });

  it("parses bold, italic, and code inline", () => {
    expect(parseInline("**Card** is *late* in `Doing`")).toEqual([
      { text: "Card", bold: true },
      { text: " is " },
      { text: "late", italic: true },
      { text: " in " },
      { text: "Doing", code: true },
    ]);
  });

  it("separates ordered and unordered lists", () => {
    const blocks = parseChatMarkdown("1. First\n2. Second\n- Loose");
    expect(blocks).toHaveLength(2);
    expect(blocks[0].type === "list" && blocks[0].ordered).toBe(true);
  });
});
