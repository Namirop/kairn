import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  estCouvert,
  noterCommeSignales,
  pasEncoreSignales,
  trouverLesDocsARelire,
} from "./docs-a-relire";

const carte = {
  "README.md": ["package.json", "lib/jobs/"],
  "docs/paiement.md": ["lib/paiement/"],
};

describe("estCouvert", () => {
  it("ne prend un préfixe de dossier que si le motif finit par une barre", () => {
    expect(estCouvert("lib/jobs/queue.ts", "lib/jobs/")).toBe(true);
    expect(estCouvert("lib/jobs-old/queue.ts", "lib/jobs/")).toBe(false);
  });

  it("prend un motif de fichier à l'identique", () => {
    expect(estCouvert("package.json", "package.json")).toBe(true);
    expect(estCouvert("scripts/package.json", "package.json")).toBe(false);
  });
});

describe("trouverLesDocsARelire", () => {
  it("nomme la doc et les fichiers modifiés qu'elle couvre", () => {
    expect(
      trouverLesDocsARelire(["lib/jobs/b.ts", "lib/jobs/a.ts", "app/page.tsx"], carte),
    ).toEqual([{ doc: "README.md", aCauseDe: ["lib/jobs/a.ts", "lib/jobs/b.ts"] }]);
  });

  it("se tait quand la doc a changé dans le même diff", () => {
    expect(trouverLesDocsARelire(["lib/paiement/webhook.ts", "docs/paiement.md"], carte)).toEqual(
      [],
    );
  });

  it("se tait quand rien de couvert n'a changé", () => {
    expect(trouverLesDocsARelire(["app/page.tsx"], carte)).toEqual([]);
  });
});

describe("signaler une seule fois", () => {
  it("ne signale un fichier que la première fois", () => {
    const aRelire = trouverLesDocsARelire(["lib/jobs/a.ts"], carte);
    const signales = noterCommeSignales({}, aRelire);
    expect(pasEncoreSignales(aRelire, signales)).toEqual([]);
  });

  it("signale un nouveau fichier sous une doc déjà signalée", () => {
    const signales = noterCommeSignales({}, trouverLesDocsARelire(["lib/jobs/a.ts"], carte));
    const aRelire = trouverLesDocsARelire(["lib/jobs/a.ts", "package.json"], carte);
    expect(pasEncoreSignales(aRelire, signales)).toEqual([
      { doc: "README.md", aCauseDe: ["package.json"] },
    ]);
  });

  it("ne signale jamais deux fois le même fichier, quel que soit l'ordre des diffs", () => {
    const fichier = fc.constantFrom(
      "package.json",
      "lib/jobs/a.ts",
      "lib/paiement/x.ts",
      "app/a.ts",
    );
    fc.assert(
      fc.property(fc.array(fc.array(fichier)), (diffs) => {
        let signales = {};
        const vus = new Set<string>();
        for (const diff of diffs) {
          const nouveaux = pasEncoreSignales(trouverLesDocsARelire(diff, carte), signales);
          for (const { doc, aCauseDe } of nouveaux) {
            for (const f of aCauseDe) {
              const cle = `${doc}:${f}`;
              if (vus.has(cle)) return false;
              vus.add(cle);
            }
          }
          signales = noterCommeSignales(signales, nouveaux);
        }
        return true;
      }),
    );
  });
});
