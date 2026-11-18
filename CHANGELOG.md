# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.1.0] - 2026-11-19

### Added

- MCP server over stdio with three read-only tools: `search_docs` (with structured output), `get_section` and `list_docs`.
- Heading-section indexing of markdown folders, keeping code blocks intact, and BM25 ranking with weighted heading words.
- `examples/search.mjs` (a client over stdio) and `examples/eval.mjs` (scores search on rag-eval-lab's eval set).
- Docker image, with a CI smoke test that sends a real MCP `initialize` request.
