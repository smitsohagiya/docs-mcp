# ADR-0001: BM25 first, no embeddings

- Status: accepted
- Date: 2026-11-19

## Context

An MCP server runs on the user's machine, often started by an editor. It has to start in a moment, need no API key, and add no services. Embeddings would need either a downloaded model or an API, plus an index to keep fresh.

## Decision

Rank heading sections with Okapi BM25 (k1 1.2, b 0.75), counting heading words twice and ignoring common stopwords. The index is built in memory at startup.

## Consequences

- On rag-eval-lab's 100 questions over the FastAPI docs, this reaches Hit@5 85% and MRR@10 0.683 at about 0.5 ms per question, against Hit@5 88% and MRR@10 0.729 for vector search with a local embedding model.
- Paraphrased questions that share no words with the docs are the weak spot. Hybrid search is the next step, and it will be measured with the same script before it ships.
