import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { loadSections } from "../../src/index/sections.js";
import { createServer } from "../../src/server.js";

const client = new Client({ name: "test", version: "1.0.0" });

beforeAll(async () => {
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await createServer(loadSections("test/fixtures/docs")).connect(serverSide);
  await client.connect(clientSide);
});

afterAll(async () => {
  await client.close();
});

function text(result: Awaited<ReturnType<typeof client.callTool>>): string {
  const content = result.content as { type: string; text: string }[];
  return content.map((c) => c.text).join("");
}

describe("docs-mcp server", () => {
  it("offers three read-only tools", async () => {
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(["get_section", "list_docs", "search_docs"]);
    expect(tools.every((t) => t.annotations?.readOnlyHint === true)).toBe(true);
  });

  it("searches and returns structured results", async () => {
    const result = await client.callTool({
      name: "search_docs",
      arguments: { query: "optional query parameter", limit: 2 },
    });
    const structured = result.structuredContent as { results: { id: string; heading: string }[] };
    expect(structured.results).toHaveLength(2);
    expect(structured.results[0]?.heading).toBe("Query Parameters > Optional parameters");
    expect(text(result)).toContain("guide/query.md :: Query Parameters > Optional parameters");
  });

  it("reads a section by id and reports unknown ids as errors", async () => {
    const search = await client.callTool({ name: "search_docs", arguments: { query: "docker" } });
    const id = (search.structuredContent as { results: { id: string }[] }).results[0]?.id ?? "";
    const section = await client.callTool({ name: "get_section", arguments: { id } });
    expect(text(section)).toContain("Build a Docker image");
    const missing = await client.callTool({ name: "get_section", arguments: { id: "nope.md#9" } });
    expect(missing.isError).toBe(true);
  });

  it("explains when nothing matches", async () => {
    const result = await client.callTool({
      name: "search_docs",
      arguments: { query: "kubernetes helm" },
    });
    expect(text(result)).toBe('No sections match "kubernetes helm".');
  });

  it("lists pages with an optional prefix", async () => {
    const all = text(await client.callTool({ name: "list_docs", arguments: {} }));
    expect(all.split("\n")).toHaveLength(3);
    const guide = text(
      await client.callTool({ name: "list_docs", arguments: { prefix: "guide/" } }),
    );
    expect(guide).toContain("guide/query.md : Query Parameters (3 sections)");
    expect(text(await client.callTool({ name: "list_docs", arguments: { prefix: "zzz" } }))).toBe(
      "No pages match.",
    );
  });
});
