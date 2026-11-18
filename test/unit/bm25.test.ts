import { describe, expect, it } from "vitest";

import { Bm25Index, snippet, tokenize } from "../../src/index/bm25.js";
import { loadSections } from "../../src/index/sections.js";

const index = new Bm25Index(loadSections("test/fixtures/docs"));

describe("Bm25Index", () => {
  it("ranks the section that answers the question first", () => {
    expect(index.search("how do I make a query parameter optional", 3)[0]?.section.heading).toBe(
      "Query Parameters > Optional parameters",
    );
    expect(index.search("docker image container", 3)[0]?.section.heading).toBe(
      "Deployment > Docker",
    );
  });

  it("returns nothing for a question made only of stopwords", () => {
    expect(index.search("how do I", 5)).toEqual([]);
  });

  it("limits and orders results by score", () => {
    const hits = index.search("parameters", 2);
    expect(hits).toHaveLength(2);
    expect(hits[0]?.score).toBeGreaterThanOrEqual(hits[1]?.score ?? 0);
    expect(index.size).toBeGreaterThan(5);
  });
});

describe("tokenize and snippet", () => {
  it("lowercases, drops stopwords and one-letter words", () => {
    expect(tokenize("How do I run a Docker image?")).toEqual(["run", "docker", "image"]);
  });

  it("centres the snippet on the first query word", () => {
    const text = `${"filler ".repeat(80)}the docker image is built here ${"tail ".repeat(80)}`;
    const piece = snippet(text, "docker", 60);
    expect(piece).toContain("docker image");
    expect(piece.startsWith("…")).toBe(true);
    expect(piece.endsWith("…")).toBe(true);
  });
});
