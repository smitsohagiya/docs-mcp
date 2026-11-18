// Ask docs-mcp a question over stdio, the same way an AI assistant would.
// Usage: node examples/search.mjs <docs-directory> "<question>"
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const [docs, question] = process.argv.slice(2);
if (!docs || !question) {
  console.error('usage: node examples/search.mjs <docs-directory> "<question>"');
  process.exit(2);
}

const client = new Client({ name: "example", version: "1.0.0" });
await client.connect(new StdioClientTransport({ command: "node", args: ["dist/cli.js", docs] }));

const { tools } = await client.listTools();
console.log(`tools: ${tools.map((tool) => tool.name).join(", ")}\n`);

const search = await client.callTool({
  name: "search_docs",
  arguments: { query: question, limit: 3 },
});
console.log(search.content[0].text, "\n");

const best = search.structuredContent.results[0];
if (best) {
  const section = await client.callTool({ name: "get_section", arguments: { id: best.id } });
  console.log(section.content[0].text.slice(0, 600));
}
await client.close();
