# docs-mcp

[![CI](https://github.com/smitsohagiya/docs-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/smitsohagiya/docs-mcp/actions/workflows/ci.yml)

An MCP server that gives AI assistants (Claude Code, Claude Desktop, Cursor) fast, cited search over any folder of markdown docs. Point it at a directory, and the assistant gets three read-only tools: `search_docs`, `get_section` and `list_docs`. There's no model, API key or database.

## Why

Coding assistants are much better when they can look things up in your docs instead of guessing from training data. Model Context Protocol makes that a small, standard server. This one indexes markdown by heading section, ranks with BM25 and returns section ids, so the assistant can read the exact section it cites.

## Tools

| Tool          | Input                                 | Returns                                                                                      |
| ------------- | ------------------------------------- | -------------------------------------------------------------------------------------------- |
| `search_docs` | `query`, `limit` (1 to 20, default 5) | The best sections: path, heading path, id and snippet. Also returned as `structuredContent`. |
| `get_section` | `id`                                  | The full text of one section                                                                 |
| `list_docs`   | `prefix` (optional)                   | Pages with titles and section counts                                                         |

All three are marked `readOnlyHint`. Logs go to stderr, because stdout carries the protocol.

## Quickstart

```bash
pnpm install && pnpm build
node examples/search.mjs ./path/to/docs "how do I deploy with docker"
```

**Claude Code**

```bash
claude mcp add docs -- node /absolute/path/to/docs-mcp/dist/cli.js /absolute/path/to/your/docs
```

**Claude Desktop or Cursor** (`claude_desktop_config.json` or `.cursor/mcp.json`)

```json
{
  "mcpServers": {
    "docs": {
      "command": "node",
      "args": ["/absolute/path/to/docs-mcp/dist/cli.js", "/absolute/path/to/your/docs"]
    }
  }
}
```

**Docker:** `docker run -i --rm -v "$PWD/docs:/docs:ro" docs-mcp`

## Example

Real output from `examples/search.mjs` on the FastAPI docs (157 pages, 1,176 sections). Indexing and answering took 0.29 s in total:

```console
$ node examples/search.mjs ../rag-eval-lab/data/corpus/fastapi "how do I make a query parameter optional"
tools: search_docs, get_section, list_docs

1. tutorial/query-param-models.md :: Query Parameter Models > Optional Query Parameter Models
   ## Optional Query Parameter Models Declare a query parameter model with `| None` and a default of `None` to make the group optional. …
2. tutorial/header-param-models.md :: Header Parameter Models > Optional Header Parameter Models
3. tutorial/cookie-param-models.md :: Cookie Parameter Models > Optional Cookie Parameter Models
```

## How good is the search?

`examples/eval.mjs` scores the server's search on the 100-question eval set from [rag-eval-lab](https://github.com/smitsohagiya/rag-eval-lab) over the same FastAPI docs. A hit is a section from the right page whose heading path is the answering section or one inside it:

| Search                                            | Hit@1 | Hit@5 | Hit@10 | MRR@10 | Time per question |
| ------------------------------------------------- | ----- | ----- | ------ | ------ | ----------------- |
| docs-mcp BM25 (this repo)                         | 56%   | 85%   | 92%    | 0.683  | 0.5 ms            |
| Postgres full-text, heading chunks (rag-eval-lab) | 30%   | 67%   | 84%    | 0.481  | 7 ms              |
| Vector search, heading chunks (rag-eval-lab)      | 62%   | 88%   | 95%    | 0.729  | 8 ms              |

BM25 with heading words weighted twice gets most of the way to vector search, with no model and in about half a millisecond. It also does far better than Postgres's `ts_rank_cd`, which is not BM25. The rag-eval-lab numbers judge relevance by character overlap rather than heading paths, so treat the comparison as close but not exact.

## Design decisions

- [ADR-0001](docs/decisions/ADR-0001-bm25-first.md): BM25 first, no embeddings.
- [ADR-0002](docs/decisions/ADR-0002-sections-and-read-only-tools.md): heading sections and read-only tools.

## Limitations

- Keyword search misses paraphrases that share no words with the docs. For those, rag-eval-lab shows that vector search plus re-ranking does better (Hit@1 72%).
- The index is built at startup and kept in memory, so restart the server after the docs change. Large doc sets (tens of thousands of pages) would want a persistent index.
- Markdown only. Setext headings (underlined with `===`) are treated as text.

## What I'd do next

- Optional embeddings for hybrid search, behind a flag, measured with the same eval script.
- Watch the docs folder and re-index changed files.
- Expose pages as MCP resources as well as tools.

## License

MIT
