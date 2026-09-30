import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { apercuDeProse } from "./apercu-de-prose";

describe("apercuDeProse", () => {
  it("laisse un texte ordinaire intact", () => {
    expect(apercuDeProse("Le vinaigre dissout le calcaire.", 220)).toBe(
      "Le vinaigre dissout le calcaire.",
    );
  });

  /** Le dépôt de production, lu dans la liste : trois marques sur deux lignes. */
  it("retire les dièses d'un titre et enchaîne sur la suite", () => {
    const depot = "## 2. Le dossier `android/` d'un projet Flutter\n\n### 2.1 Gradle et manifeste";

    expect(apercuDeProse(depot, 220)).toBe(
      "2. Le dossier `android/` d'un projet Flutter · 2.1 Gradle et manifeste",
    );
  });

  it("retire les astérisques du gras", () => {
    expect(apercuDeProse("**En bref** — un projet natif.", 220)).toBe("En bref — un projet natif.");
  });

  it("met une liste à plat", () => {
    expect(apercuDeProse("- une\n- deux\n- trois", 220)).toBe("une · deux · trois");
  });

  it("met un tableau à plat sans ses barres", () => {
    const tableau = "| fichier | rôle |\n|---|---|\n| settings.gradle.kts | plan du projet |";

    expect(apercuDeProse(tableau, 220)).toBe(
      "fichier · rôle · settings.gradle.kts · plan du projet",
    );
  });

  it("ramène les retours à la ligne à des espaces", () => {
    expect(apercuDeProse("une ligne\nune autre", 220)).toBe("une ligne une autre");
  });

  it("garde les accents graves, que le rendu relève en jetons", () => {
    expect(apercuDeProse("Le dossier `android/` sert d'hôte.", 220)).toContain("`android/`");
  });

  it("coupe à la longueur demandée", () => {
    expect(apercuDeProse("## Un titre assez long pour dépasser", 12)).toBe("Un titre ass");
  });

  it("ne rend rien d'un dépôt vide", () => {
    expect(apercuDeProse("", 220)).toBe("");
    expect(apercuDeProse("\n\n   \n", 220)).toBe("");
  });

  /**
   * Un dièse seul n'est pas un titre, une barre seule n'est pas un tableau : ce
   * qui n'est pas une marque reste du texte, et l'aperçu le rend tel quel. La
   * propriété porte donc sur ce qu'on garantit vraiment — une ligne, bornée.
   */
  it("rend toujours une seule ligne, bornée et sans blanc de bord", () => {
    fc.assert(
      fc.property(fc.string(), fc.integer({ min: 1, max: 300 }), (texte, longueur) => {
        const apercu = apercuDeProse(texte, longueur);

        expect(apercu.length).toBeLessThanOrEqual(longueur);
        expect(apercu).toBe(apercu.trim());
        expect(apercu).not.toContain("\n");
      }),
      { numRuns: 400 },
    );
  });
});
