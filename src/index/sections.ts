import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

/** One heading section of a markdown page, the unit that search returns. */
export interface Section {
  /** Stable id: "<path>#<index>". */
  id: string;
  path: string;
  title: string;
  /** Heading path, e.g. "Query Parameters > Optional parameters". */
  heading: string;
  text: string;
}

const HEADING = /^ {0,3}(#{1,6})[ \t]+(.+?)(?:[ \t]+#+)?[ \t]*$/;
const FENCE = /^ {0,3}(`{3,}|~{3,})/;
const ANCHOR = /\s*\{\s*#[^}]*\}\s*$/;

function closesFence(line: string, marker: string): boolean {
  const indent = line.length - line.trimStart().length;
  const fence = line.trim();
  const char = marker.charAt(0);
  return indent <= 3 && fence.length >= marker.length && fence === char.repeat(fence.length);
}

/**
 * Split a page into heading sections. Lines inside fenced code blocks never count as headings,
 * and sections that hold nothing but a heading are dropped.
 */
export function splitSections(path: string, markdown: string): Section[] {
  const lines = markdown.split(/\r?\n/);
  const stack: { level: number; title: string }[] = [];
  const sections: { heading: string; lines: string[] }[] = [{ heading: "", lines: [] }];
  let fence: string | undefined;
  let title = path;

  for (const line of lines) {
    if (fence) {
      if (closesFence(line, fence)) fence = undefined;
      sections.at(-1)?.lines.push(line);
      continue;
    }
    const opening = FENCE.exec(line);
    if (opening?.[1]) {
      fence = opening[1];
      sections.at(-1)?.lines.push(line);
      continue;
    }
    const heading = HEADING.exec(line);
    if (heading?.[1] && heading[2]) {
      const level = heading[1].length;
      const text = heading[2].replace(ANCHOR, "").trim();
      while (stack.length > 0 && (stack.at(-1)?.level ?? 0) >= level) stack.pop();
      stack.push({ level, title: text });
      if (level === 1 && title === path) title = text;
      sections.push({
        heading: stack.map((s) => s.title).join(" > "),
        lines: [`${heading[1]} ${text}`],
      });
      continue;
    }
    sections.at(-1)?.lines.push(line);
  }

  return sections
    .map((s) => ({ heading: s.heading, text: s.lines.join("\n").trim() }))
    .filter((s) => s.text.length > 0 && !/^#{1,6} [^\n]*$/.test(s.text))
    .map((s, index) => ({
      id: `${path}#${String(index)}`,
      path,
      title,
      heading: s.heading,
      text: s.text,
    }));
}

/** Read every .md file under ``root`` (sorted, so ids are stable) and split it into sections. */
export function loadSections(root: string): Section[] {
  const files: string[] = [];
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir).sort()) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (name.endsWith(".md")) files.push(full);
    }
  };
  walk(root);
  return files.flatMap((file) =>
    splitSections(relative(root, file).split(sep).join("/"), readFileSync(file, "utf8")),
  );
}
