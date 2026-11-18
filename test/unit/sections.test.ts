import { describe, expect, it } from "vitest";

import { loadSections, splitSections } from "../../src/index/sections.js";

const FENCE = "`".repeat(3);

describe("splitSections", () => {
  it("builds heading paths, strips anchors and keeps code with its section", () => {
    const sections = splitSections(
      "q.md",
      `# Query { #query }\n\nIntro.\n\n## Optional\n\nUse None.\n\n${FENCE}python\n# not a heading\nx = 1\n${FENCE}\n\n### Detail\n\nMore.\n`,
    );
    expect(sections.map((s) => s.heading)).toEqual([
      "Query",
      "Query > Optional",
      "Query > Optional > Detail",
    ]);
    expect(sections[1]?.text).toContain("# not a heading");
    expect(sections.every((s) => s.title === "Query")).toBe(true);
    expect(sections.map((s) => s.id)).toEqual(["q.md#0", "q.md#1", "q.md#2"]);
  });

  it("drops sections that hold only a heading and keeps text before the first heading", () => {
    const sections = splitSections("d.md", "Preamble text.\n\n# Title\n\n## Sub\n\nBody.\n");
    expect(sections.map((s) => [s.heading, s.text])).toEqual([
      ["", "Preamble text."],
      ["Title > Sub", "## Sub\n\nBody."],
    ]);
    expect(sections[0]?.title).toBe("Title");
  });
});

describe("loadSections", () => {
  it("reads every markdown file under the root in a stable order", () => {
    const sections = loadSections("test/fixtures/docs");
    expect([...new Set(sections.map((s) => s.path))]).toEqual([
      "guide/deploy.md",
      "guide/query.md",
      "index.md",
    ]);
    expect(sections.find((s) => s.path === "index.md")?.title).toBe("Example Docs");
  });
});
