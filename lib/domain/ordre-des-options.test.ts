import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { ordonnerLesOptions } from "./ordre-des-options";

/** Quatre options textuelles, distinctes, sans chiffre : le cas du mélange. */
const quatreOptions = fc.uniqueArray(
  fc.string({ minLength: 1, maxLength: 40 }).filter((texte) => !/\d/.test(texte)),
  { minLength: 4, maxLength: 4 },
);

const rang = fc.integer({ min: 0, max: 3 });
const graine = fc.string({ minLength: 1, maxLength: 40 });

describe("ordonnerLesOptions", () => {
  it("rend le même ordre pour la même graine", () => {
    const options = ["Son acidité", "Sa couleur", "Sa viscosité", "Sa température"];

    expect(ordonnerLesOptions(options, 0, "variant-1")).toEqual(
      ordonnerLesOptions(options, 0, "variant-1"),
    );
  });

  it("rend un ordre différent pour une autre graine", () => {
    const options = ["Son acidité", "Sa couleur", "Sa viscosité", "Sa température"];
    const vus = new Set(
      ["a", "b", "c", "d", "e", "f", "g", "h"].map(
        (graine) => ordonnerLesOptions(options, 0, graine).correctIndex,
      ),
    );

    expect(vus.size).toBeGreaterThan(1);
  });

  it("garde les mêmes options, et la bonne reste la bonne", () => {
    fc.assert(
      fc.property(quatreOptions, rang, graine, (options, correctIndex, graine) => {
        const servi = ordonnerLesOptions(options, correctIndex, graine);

        expect([...servi.options].sort()).toEqual([...options].sort());
        expect(servi.options[servi.correctIndex]).toBe(options[correctIndex]);
      }),
    );
  });

  it("répartit la bonne réponse à peu près également sur les quatre rangs", () => {
    const options = ["alpha", "bravo", "charlie", "delta"];
    const comptes = [0, 0, 0, 0];

    for (let index = 0; index < 1000; index += 1) {
      const { correctIndex } = ordonnerLesOptions(options, 0, `variant-${index}`);
      comptes[correctIndex] = (comptes[correctIndex] ?? 0) + 1;
    }

    // Cinq écarts-types binomiaux autour de 250, soit ±68. Une position qui
    // reste collée à 92 %, comme le fait le modèle, est très loin dehors.
    for (const compte of comptes) {
      expect(compte).toBeGreaterThan(182);
      expect(compte).toBeLessThan(318);
    }
  });

  it("ne dépend pas de la position d'origine de la bonne réponse", () => {
    fc.assert(
      fc.property(quatreOptions, graine, (options, graine) => {
        const ordres = [0, 1, 2, 3].map((depart) =>
          ordonnerLesOptions(options, depart, graine).options.join("|"),
        );

        expect(new Set(ordres).size).toBe(1);
      }),
    );
  });

  it("trie les dates plutôt que de les mélanger", () => {
    const servi = ordonnerLesOptions(["1983", "1793", "2019", "1889"], 0, "peu-importe");

    expect(servi.options).toEqual(["1793", "1889", "1983", "2019"]);
    expect(servi.options[servi.correctIndex]).toBe("1983");
  });

  it("trie les durées, unité comprise", () => {
    const servi = ordonnerLesOptions(
      ["90 minutes", "20 minutes", "5 minutes", "45 minutes"],
      2,
      "g",
    );

    expect(servi.options).toEqual(["5 minutes", "20 minutes", "45 minutes", "90 minutes"]);
    expect(servi.options[servi.correctIndex]).toBe("5 minutes");
  });

  it("lit les nombres à séparateur de milliers", () => {
    const servi = ordonnerLesOptions(["20 000", "1 500", "300", "8 000"], 0, "g");

    expect(servi.options).toEqual(["300", "1 500", "8 000", "20 000"]);
  });

  /** L'ordre obtenu sur huit graines : une seule valeur si le tri a décidé. */
  const ordresSurPlusieursGraines = (options: string[]) =>
    new Set(
      ["a", "b", "c", "d", "e", "f", "g", "h"].map((graine) =>
        ordonnerLesOptions(options, 0, graine).options.join("|"),
      ),
    );

  it("laisse la graine décider quand les options ne sont pas des quantités", () => {
    // Le 3 et le 5 ne font pas de ces options des quantités : les trier par eux
    // donnerait un ordre que personne ne comprendrait.
    const ordres = ordresSurPlusieursGraines([
      "Le scénario tient en 3 actes",
      "Les acteurs jouent à 5 dans la scène",
      "La mise en scène reste sobre",
      "Le montage accélère la fin",
    ]);

    expect(ordres.size).toBeGreaterThan(1);
  });

  it("ignore la graine quand les options sont des quantités", () => {
    expect(ordresSurPlusieursGraines(["1983", "1793", "2019", "1889"]).size).toBe(1);
  });

  it("mélange quand deux quantités sont égales, l'ordre étant ambigu", () => {
    const servi = ordonnerLesOptions(["10 %", "10 %", "40 %", "25 %"], 2, "graine");

    expect(servi.options[servi.correctIndex]).toBe("40 %");
  });

  it("refuse une bonne réponse qui n'est pas dans les options", () => {
    expect(() => ordonnerLesOptions(["a", "b", "c", "d"], 4, "g")).toThrow(RangeError);
  });

  it("laisse une option seule telle quelle", () => {
    expect(ordonnerLesOptions(["seule"], 0, "g")).toEqual({ options: ["seule"], correctIndex: 0 });
  });
});
