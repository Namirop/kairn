import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { findStaleDocs, isCovered, markReported, notYetReported } from "./stale-docs";

const map = {
  "README.md": ["package.json", "lib/jobs/"],
  "docs/paiement.md": ["lib/paiement/"],
};

describe("isCovered", () => {
  it("matches a directory prefix only when the pattern ends with a slash", () => {
    expect(isCovered("lib/jobs/queue.ts", "lib/jobs/")).toBe(true);
    expect(isCovered("lib/jobs-old/queue.ts", "lib/jobs/")).toBe(false);
  });

  it("matches a file pattern exactly", () => {
    expect(isCovered("package.json", "package.json")).toBe(true);
    expect(isCovered("scripts/package.json", "package.json")).toBe(false);
  });
});

describe("findStaleDocs", () => {
  it("names the document and the files that changed under it", () => {
    expect(findStaleDocs(["lib/jobs/b.ts", "lib/jobs/a.ts", "app/page.tsx"], map)).toEqual([
      { doc: "README.md", because: ["lib/jobs/a.ts", "lib/jobs/b.ts"] },
    ]);
  });

  it("stays quiet when the document changed in the same diff", () => {
    expect(findStaleDocs(["lib/paiement/webhook.ts", "docs/paiement.md"], map)).toEqual([]);
  });

  it("stays quiet when nothing covered changed", () => {
    expect(findStaleDocs(["app/page.tsx"], map)).toEqual([]);
  });
});

describe("reporting once", () => {
  it("reports a file only the first time", () => {
    const stale = findStaleDocs(["lib/jobs/a.ts"], map);
    const reported = markReported({}, stale);
    expect(notYetReported(stale, reported)).toEqual([]);
  });

  it("reports a new file under an already reported document", () => {
    const reported = markReported({}, findStaleDocs(["lib/jobs/a.ts"], map));
    const stale = findStaleDocs(["lib/jobs/a.ts", "package.json"], map);
    expect(notYetReported(stale, reported)).toEqual([
      { doc: "README.md", because: ["package.json"] },
    ]);
  });

  it("never reports the same file twice, whatever the order of the diffs", () => {
    const file = fc.constantFrom("package.json", "lib/jobs/a.ts", "lib/paiement/x.ts", "app/a.ts");
    fc.assert(
      fc.property(fc.array(fc.array(file)), (diffs) => {
        let reported = {};
        const seen = new Set<string>();
        for (const diff of diffs) {
          const fresh = notYetReported(findStaleDocs(diff, map), reported);
          for (const { doc, because } of fresh) {
            for (const f of because) {
              const key = `${doc}:${f}`;
              if (seen.has(key)) return false;
              seen.add(key);
            }
          }
          reported = markReported(reported, fresh);
        }
        return true;
      }),
    );
  });
});
