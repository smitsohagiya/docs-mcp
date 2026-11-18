# ADR-0002: Return heading sections, through read-only tools

- Status: accepted
- Date: 2026-11-19

## Context

An assistant needs enough text to answer and a stable reference to cite. Whole pages are too long, and fixed-size windows cut through code and lose the heading that says what the text is about.

## Decision

Index each heading section with its heading path ("Query Parameters > Optional parameters") and a stable id (`<path>#<index>`). `search_docs` returns ids, paths, headings and snippets, and `get_section` returns one full section. All tools are marked `readOnlyHint`, so clients can call them without asking the user each time.

## Consequences

- Answers can cite the exact section, and the assistant only pulls in the full text it needs.
- Ids depend on file order and section order, so they change when the docs change. That's fine within a session, but they shouldn't be stored long-term.
