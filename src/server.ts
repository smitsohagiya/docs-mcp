import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { Bm25Index, snippet } from "./index/bm25.js";
import type { Section } from "./index/sections.js";

export const VERSION = "0.1.0";

const readOnly = { readOnlyHint: true, openWorldHint: false };

/** Build the MCP server over a set of sections. All three tools are read-only. */
export function createServer(sections: Section[]): McpServer {
  const index = new Bm25Index(sections);
  const byId = new Map(sections.map((section) => [section.id, section]));
  const server = new McpServer({ name: "docs-mcp", version: VERSION });

  server.registerTool(
    "search_docs",
    {
      title: "Search the docs",
      description:
        "Full-text search (BM25) over the documentation. Returns the best-matching sections with " +
        "their ids and a snippet. Call get_section with an id to read the whole section.",
      inputSchema: {
        query: z.string().min(2).describe("What to look for, in plain words."),
        limit: z.number().int().min(1).max(20).default(5).describe("How many sections to return."),
      },
      outputSchema: {
        results: z.array(
          z.object({
            id: z.string(),
            path: z.string(),
            heading: z.string(),
            score: z.number(),
            snippet: z.string(),
          }),
        ),
      },
      annotations: readOnly,
    },
    ({ query, limit }) => {
      const results = index.search(query, limit).map(({ section, score }) => ({
        id: section.id,
        path: section.path,
        heading: section.heading,
        score: Number(score.toFixed(3)),
        snippet: snippet(section.text, query),
      }));
      const text =
        results.length === 0
          ? `No sections match "${query}".`
          : results
              .map(
                (r, i) =>
                  `${String(i + 1)}. ${r.path} :: ${r.heading} (id: ${r.id})\n   ${r.snippet}`,
              )
              .join("\n");
      return { content: [{ type: "text", text }], structuredContent: { results } };
    },
  );

  server.registerTool(
    "get_section",
    {
      title: "Read a section",
      description: "Return the full text of a section, by the id that search_docs returned.",
      inputSchema: { id: z.string().describe('A section id such as "guide/query.md#2".') },
      annotations: readOnly,
    },
    ({ id }) => {
      const section = byId.get(id);
      if (!section) {
        return {
          isError: true,
          content: [
            { type: "text", text: `No section with id "${id}". Use search_docs to find ids.` },
          ],
        };
      }
      return {
        content: [
          { type: "text", text: `${section.path} :: ${section.heading}\n\n${section.text}` },
        ],
      };
    },
  );

  server.registerTool(
    "list_docs",
    {
      title: "List the pages",
      description:
        "List the documentation pages, optionally only those whose path starts with a prefix.",
      inputSchema: { prefix: z.string().optional().describe('Path prefix, e.g. "tutorial/".') },
      annotations: readOnly,
    },
    ({ prefix }) => {
      const pages = new Map<string, { title: string; sections: number }>();
      for (const section of sections) {
        if (prefix && !section.path.startsWith(prefix)) continue;
        const page = pages.get(section.path) ?? { title: section.title, sections: 0 };
        page.sections += 1;
        pages.set(section.path, page);
      }
      const text =
        pages.size === 0
          ? "No pages match."
          : [...pages]
              .map(([path, p]) => `${path} : ${p.title} (${String(p.sections)} sections)`)
              .join("\n");
      return { content: [{ type: "text", text }] };
    },
  );

  return server;
}
