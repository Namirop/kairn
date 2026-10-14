import type { DocMap } from "./doc-map";

/** A document whose covered code changed while the document itself did not. */
export type StaleDoc = { doc: string; because: string[] };

/** Files already reported, per document, so the same warning is not repeated. */
export type Reported = Readonly<Record<string, readonly string[]>>;

export function isCovered(file: string, pattern: string): boolean {
  return pattern.endsWith("/") ? file.startsWith(pattern) : file === pattern;
}

export function findStaleDocs(changed: readonly string[], map: DocMap): StaleDoc[] {
  const unique = [...new Set(changed)];
  const touched = new Set(unique);
  return Object.entries(map)
    .filter(([doc]) => !touched.has(doc))
    .map(([doc, patterns]) => ({
      doc,
      because: unique.filter((file) => patterns.some((p) => isCovered(file, p))).sort(),
    }))
    .filter((stale) => stale.because.length > 0);
}

/** Keeps only the files not reported yet for each document. */
export function notYetReported(stale: readonly StaleDoc[], reported: Reported): StaleDoc[] {
  return stale
    .map(({ doc, because }) => {
      const already = new Set(reported[doc] ?? []);
      return { doc, because: because.filter((file) => !already.has(file)) };
    })
    .filter((s) => s.because.length > 0);
}

export function markReported(reported: Reported, stale: readonly StaleDoc[]): Reported {
  const next: Record<string, string[]> = {};
  for (const [doc, files] of Object.entries(reported)) next[doc] = [...files];
  for (const { doc, because } of stale) {
    next[doc] = [...new Set([...(next[doc] ?? []), ...because])].sort();
  }
  return next;
}
