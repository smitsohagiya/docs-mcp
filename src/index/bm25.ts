import type { Section } from "./sections.js";

const STOPWORDS = new Set(
  "a an and are as at be but by can do does for from how i if in into is it its my of on or so that the their them then there these this to use using was we what when where which who why will with you your".split(
    " ",
  ),
);

/** Lowercase words of two or more characters, without common stopwords. */
export function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9_]{2,}/g) ?? []).filter((word) => !STOPWORDS.has(word));
}

export interface SearchHit {
  section: Section;
  score: number;
}

interface Doc {
  section: Section;
  terms: Map<string, number>;
  length: number;
}

/**
 * Okapi BM25 over sections. Heading words count `headingBoost` times, because a section's
 * heading is usually the best summary of what it answers.
 */
export class Bm25Index {
  private readonly docs: Doc[];
  private readonly documentFrequency = new Map<string, number>();
  private readonly averageLength: number;

  constructor(
    sections: Section[],
    private readonly k1 = 1.2,
    private readonly b = 0.75,
    headingBoost = 2,
  ) {
    this.docs = sections.map((section) => {
      const terms = new Map<string, number>();
      const words = [...tokenize(section.heading), ...tokenize(section.text)];
      for (const word of words) terms.set(word, (terms.get(word) ?? 0) + 1);
      for (const word of tokenize(section.heading)) {
        terms.set(word, (terms.get(word) ?? 0) + headingBoost - 1);
      }
      for (const word of terms.keys()) {
        this.documentFrequency.set(word, (this.documentFrequency.get(word) ?? 0) + 1);
      }
      return { section, terms, length: words.length };
    });
    const total = this.docs.reduce((sum, doc) => sum + doc.length, 0);
    this.averageLength = this.docs.length > 0 ? total / this.docs.length : 0;
  }

  get size(): number {
    return this.docs.length;
  }

  search(query: string, limit: number): SearchHit[] {
    const words = [...new Set(tokenize(query))];
    if (words.length === 0) return [];
    const n = this.docs.length;
    const hits: SearchHit[] = [];
    for (const doc of this.docs) {
      let score = 0;
      for (const word of words) {
        const frequency = doc.terms.get(word);
        if (!frequency) continue;
        const df = this.documentFrequency.get(word) ?? 0;
        const idf = Math.log(1 + (n - df + 0.5) / (df + 0.5));
        const norm = this.k1 * (1 - this.b + (this.b * doc.length) / (this.averageLength || 1));
        score += (idf * frequency * (this.k1 + 1)) / (frequency + norm);
      }
      if (score > 0) hits.push({ section: doc.section, score });
    }
    return hits
      .sort((x, y) => y.score - x.score || x.section.id.localeCompare(y.section.id))
      .slice(0, limit);
  }
}

/** A short excerpt around the first query word found in the text. */
export function snippet(text: string, query: string, width = 240): string {
  const flat = text.replace(/\s+/g, " ").trim();
  const lower = flat.toLowerCase();
  const positions = tokenize(query)
    .map((word) => lower.indexOf(word))
    .filter((index) => index >= 0);
  const center = positions.length > 0 ? Math.min(...positions) : 0;
  const start = Math.max(0, center - Math.floor(width / 3));
  const piece = flat.slice(start, start + width);
  return `${start > 0 ? "…" : ""}${piece}${start + width < flat.length ? "…" : ""}`;
}
