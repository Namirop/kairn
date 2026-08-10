import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  choisirVariante,
  doitRegenerer,
  PASSAGES_AVANT_REGENERATION,
  type VarianteServable,
} from "./rotation-variantes";

const FACETTES = ["RECOGNITION", "MECHANISM", "BOUNDARY", "APPLICATION"] as const;

function variante(
  facet: string,
  seenCount = 0,
  lastSeenAt: string | null = null,
): VarianteServable {
  return {
    id: `${facet}-${seenCount}`,
    facet,
    seenCount,
    lastSeenAt: lastSeenAt ? new Date(lastSeenAt) : null,
  };
}

function lotNeuf(): VarianteServable[] {
  return FACETTES.map((facet) => variante(facet));
}

describe("choisirVariante", () => {
  it("rend null quand le concept n'a aucune question active", () => {
    expect(choisirVariante([], null)).toBeNull();
  });

  it("sert la facette la moins vue", () => {
    const variantes = [
      variante("RECOGNITION", 3, "2026-01-01"),
      variante("MECHANISM", 1, "2026-01-02"),
      variante("BOUNDARY", 2, "2026-01-03"),
    ];

    expect(choisirVariante(variantes, null)?.facet).toBe("MECHANISM");
  });

  it("départage deux facettes à égalité par la plus ancienne", () => {
    const variantes = [
      variante("RECOGNITION", 2, "2026-01-10"),
      variante("MECHANISM", 2, "2026-01-03"),
      variante("BOUNDARY", 2, "2026-01-07"),
    ];

    expect(choisirVariante(variantes, null)?.facet).toBe("MECHANISM");
  });

  it("fait passer une facette jamais servie avant une facette déjà vue", () => {
    const variantes = [variante("RECOGNITION", 0, "2026-01-01"), variante("MECHANISM", 0, null)];

    expect(choisirVariante(variantes, null)?.facet).toBe("MECHANISM");
  });

  it("ne sert jamais deux fois la même facette d'affilée", () => {
    // La moins vue est aussi celle qui vient d'être servie : elle cède la place.
    const variantes = [
      variante("RECOGNITION", 0, "2026-01-10"),
      variante("MECHANISM", 5, "2026-01-02"),
    ];

    expect(choisirVariante(variantes, "RECOGNITION")?.facet).toBe("MECHANISM");
  });

  it("repose la seule facette restante plutôt que de ne rien poser", () => {
    const variantes = [variante("RECOGNITION", 4, "2026-01-10")];

    expect(choisirVariante(variantes, "RECOGNITION")?.facet).toBe("RECOGNITION");
  });

  it("rend le même choix pour la même entrée", () => {
    const variantes = lotNeuf();

    expect(choisirVariante(variantes, null)).toEqual(choisirVariante(variantes, null));
  });

  it("parcourt les quatre facettes avant d'en répéter une", () => {
    let variantes = lotNeuf();
    let derniere: string | null = null;
    const servies: string[] = [];

    for (let tour = 0; tour < FACETTES.length; tour += 1) {
      const choisie = choisirVariante(variantes, derniere);

      if (!choisie) throw new Error("Une variante était attendue.");

      servies.push(choisie.facet);
      derniere = choisie.facet;
      variantes = variantes.map((v) =>
        v.id === choisie.id
          ? { ...v, seenCount: v.seenCount + 1, lastSeenAt: new Date(2026, 0, tour + 1) }
          : v,
      );
    }

    expect(new Set(servies).size).toBe(FACETTES.length);
  });

  it("ne rend jamais la facette qu'on vient de servir tant qu'il en reste une autre", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            facet: fc.constantFrom(...FACETTES),
            seenCount: fc.integer({ min: 0, max: 9 }),
            vue: fc.integer({ min: 0, max: 40 }),
          }),
          { minLength: 1, maxLength: 12 },
        ),
        fc.constantFrom<string | null>(...FACETTES, null),
        (entrees, derniere) => {
          const variantes = entrees.map((entree, rang) => ({
            id: `v-${rang}`,
            facet: entree.facet,
            seenCount: entree.seenCount,
            lastSeenAt: new Date(2026, 0, 1 + entree.vue),
          }));

          const choisie = choisirVariante(variantes, derniere);

          if (!choisie) return false;
          if (choisie.facet !== derniere) return true;

          // Elle n'a pu être reprise que parce qu'aucune autre facette n'existe.
          return new Set(variantes.map((v) => v.facet)).size === 1;
        },
      ),
      { numRuns: 300 },
    );
  });
});

describe("doitRegenerer", () => {
  it("attend que chaque facette ait atteint le seuil", () => {
    const variantes = FACETTES.map((facet) => variante(facet, PASSAGES_AVANT_REGENERATION));

    expect(doitRegenerer(variantes)).toBe(true);
  });

  it("ne déclenche pas tant qu'une facette est en retard", () => {
    const variantes = [
      variante("RECOGNITION", PASSAGES_AVANT_REGENERATION),
      variante("MECHANISM", PASSAGES_AVANT_REGENERATION),
      variante("BOUNDARY", PASSAGES_AVANT_REGENERATION),
      variante("APPLICATION", PASSAGES_AVANT_REGENERATION - 1),
    ];

    expect(doitRegenerer(variantes)).toBe(false);
  });

  it("ne déclenche pas sur un concept sans question", () => {
    expect(doitRegenerer([])).toBe(false);
  });

  it("compte par facette, pas par variante", () => {
    // Deux variantes d'une même facette usent le même angle : leurs passages
    // s'additionnent au lieu de compter chacun pour soi.
    const variantes = [
      variante("RECOGNITION", 2, "2026-01-01"),
      { ...variante("RECOGNITION", 1, "2026-01-02"), id: "recognition-bis" },
    ];

    expect(doitRegenerer(variantes)).toBe(true);
  });
});
