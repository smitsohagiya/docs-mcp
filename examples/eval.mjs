// Score docs-mcp's BM25 search on the 100-question eval set from rag-eval-lab.
// A hit is a section from the right page whose heading path is the answering section or inside it.
// Usage: node examples/eval.mjs <docs-directory> <questions.jsonl>
import { readFileSync } from "node:fs";

import { Bm25Index } from "../dist/index/bm25.js";
import { loadSections } from "../dist/index/sections.js";

const [docs, questionsFile] = process.argv.slice(2);
if (!docs || !questionsFile) {
  console.error("usage: node examples/eval.mjs <docs-directory> <questions.jsonl>");
  process.exit(2);
}

const index = new Bm25Index(loadSections(docs));
const questions = readFileSync(questionsFile, "utf8")
  .trim()
  .split("\n")
  .map((line) => JSON.parse(line));
const isHit = (section, q) =>
  section.path === q.doc_id &&
  (section.heading === q.section || section.heading.startsWith(`${q.section} > `));

let reciprocal = 0;
const found = { 1: 0, 3: 0, 5: 0, 10: 0 };
const started = performance.now();
for (const q of questions) {
  const rank = index.search(q.question, 10).findIndex((hit) => isHit(hit.section, q)) + 1;
  if (rank > 0) {
    reciprocal += 1 / rank;
    for (const k of [1, 3, 5, 10]) if (rank <= k) found[k] += 1;
  }
}
const ms = (performance.now() - started) / questions.length;
const pct = (n) => `${Math.round((100 * n) / questions.length)}%`;
console.log(`${String(index.size)} sections, ${String(questions.length)} questions`);
console.log(
  `hit@1 ${pct(found[1])}  hit@3 ${pct(found[3])}  hit@5 ${pct(found[5])}  hit@10 ${pct(found[10])}  MRR@10 ${(reciprocal / questions.length).toFixed(3)}  ${ms.toFixed(2)} ms/question`,
);
