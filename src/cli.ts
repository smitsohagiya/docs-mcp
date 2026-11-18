#!/usr/bin/env node
import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { loadSections } from "./index/sections.js";
import { createServer, VERSION } from "./server.js";

// stdout carries the MCP protocol, so every human-readable message goes to stderr.
const target = process.argv[2] ?? process.env.DOCS_DIR;
if (!target) {
  console.error("usage: docs-mcp <docs-directory>   (or set DOCS_DIR)");
  process.exit(2);
}
const root = resolve(target);
if (!existsSync(root) || !statSync(root).isDirectory()) {
  console.error(`docs-mcp: not a directory: ${root}`);
  process.exit(2);
}

const sections = loadSections(root);
await createServer(sections).connect(new StdioServerTransport());
console.error(`docs-mcp ${VERSION}: serving ${String(sections.length)} sections from ${root}`);
