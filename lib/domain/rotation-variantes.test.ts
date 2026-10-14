import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  apresLePassage,
  assezEspacee,
  doitRegenerer,
  JOURS_ENTRE_REGENERATIONS,
  PASSAGES_AVANT_REGENERATION,
  type VarianteServable,
  variantesEquivalentes,
} from "./rotation-variantes";

const JOUR_MS = 24 * 60 * 60 * 1000;

const FACETTES = ["RECOGNITION", "MECHANISM", "BOUNDARY", "APPLICATION"] as const;

function variante(
  facet: string,
  sessionCount = 0,
  lastSessionAt: string | null = null,
  trainingCount = 0,
): VarianteServable {
  return {
    id: `${facet}-${sessionCount}`,
    facet,
    sessionCount,
    trainingCount,
    lastSessionAt: lastSessionAt ? new Date(lastSessionAt) : null,
  };
}

function lotNeuf(): VarianteServable[] {
  return FACETTES.map((facet) => variante(facet));
}

describe("doitRegenerer", () => {
  it("attend que chaque facette ait atteint le seuil", () => {
    const variantes = FACETTES.map((facet) => variante(facet, PASSAGES_AVANT_REGENERATION));

    expect(doitRegenerer(variantes)).toBe(true);
  });

  it("additionne les deux modes : l'entraînement use les questions", () => {
    const variantes = FACETTES.map((facet) =>
      variante(facet, 1, "2026-01-01", PASSAGES_AVANT_REGENERATION - 1),
    );

    expect(doitRegenerer(variantes)).toBe(true);
  });

  it("ne déclenche pas quand la somme des deux reste sous le seuil", () => {
    const variantes = FACETTES.map((facet) =>
      variante(facet, 0, "2026-01-01", PASSAGES_AVANT_REGENERATION - 1),
    );

    expect(doitRegenerer(variantes)).toBe(false);
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

describe("assezEspacee", () => {
  const maintenant = new Date("2026-06-15T10:00:00Z");

  it("laisse passer un concept qui n'a jamais eu de questions", () => {
    expect(assezEspacee(null, maintenant)).toBe(true);
  });

  it("refuse tant que le délai n'est pas écoulé", () => {
    const hier = new Date(maintenant.getTime() - JOUR_MS);

    expect(assezEspacee(hier, maintenant)).toBe(false);
  });

  it("accepte au jour près", () => {
    const pile = new Date(maintenant.getTime() - JOURS_ENTRE_REGENERATIONS * JOUR_MS);
    const juste = new Date(pile.getTime() + 1);

    expect(assezEspacee(pile, maintenant)).toBe(true);
    expect(assezEspacee(juste, maintenant)).toBe(false);
  });

  it("ne dépend pas du fuseau : c'est une durée, pas une date de calendrier", () => {
    fc.assert(
      fc.property(fc.integer({ min: -400, max: 400 }), fc.nat({ max: 23 }), (jours, heure) => {
        const derniere = new Date(maintenant.getTime() - jours * JOUR_MS - heure * 3600 * 1000);
        const ecoules = maintenant.getTime() - derniere.getTime();

        return (
          assezEspacee(derniere, maintenant) === ecoules >= JOURS_ENTRE_REGENERATIONS * JOUR_MS
        );
      }),
      { numRuns: 300 },
    );
  });
});

describe("apresLePassage", () => {
  it("compte le passage sur le compteur du mode, et sur lui seul", () => {
    const variantes = lotNeuf();
    const servie = variantes[1];

    if (!servie) throw new Error("Une variante était attendue.");

    const session = apresLePassage(variantes, servie.id, "SESSION");
    const entrainement = apresLePassage(variantes, servie.id, "TRAINING");

    expect(session[1]).toMatchObject({ sessionCount: 1, trainingCount: 0 });
    expect(entrainement[1]).toMatchObject({ sessionCount: 0, trainingCount: 1 });
  });

  it("laisse les autres variantes intactes", () => {
    const variantes = lotNeuf();
    const apres = apresLePassage(variantes, "RECOGNITION-0", "TRAINING");

    expect(apres.slice(1)).toEqual(variantes.slice(1));
  });

  it("ne modifie pas ce qu'on lui donne", () => {
    const variantes = lotNeuf();

    apresLePassage(variantes, "RECOGNITION-0", "SESSION");

    expect(variantes[0]?.sessionCount).toBe(0);
  });

  it("ne compte rien quand la variante servie n'est pas du lot", () => {
    const variantes = lotNeuf();

    expect(apresLePassage(variantes, "inconnue", "SESSION")).toEqual(variantes);
  });

  it("mène au seuil par un mode comme par l'autre", () => {
    fc.assert(
      fc.property(fc.constantFrom("SESSION" as const, "TRAINING" as const), (mode) => {
        let variantes = FACETTES.map((facet) =>
          variante(facet, 0, null, PASSAGES_AVANT_REGENERATION - 1),
        );

        // Il manque un passage à chaque facette : aucun mode ne doit suffire à
        // déclencher avant que les quatre l'aient reçu.
        for (const cible of [...variantes]) {
          expect(doitRegenerer(variantes)).toBe(false);
          variantes = apresLePassage(variantes, cible.id, mode);
        }

        return doitRegenerer(variantes);
      }),
      { numRuns: 50 },
    );
  });
});

/** La variante que l'appelant retiendrait sans départage : la première des équivalentes. */
function premiereEquivalente(
  variantes: VarianteServable[],
  derniere: string | null,
): VarianteServable | null {
  return variantesEquivalentes(variantes, derniere)[0] ?? null;
}

describe("variantesEquivalentes, première retenue", () => {
  it("rend null quand le concept n'a aucune question active", () => {
    expect(premiereEquivalente([], null)).toBeNull();
  });

  it("sert la facette la moins vue", () => {
    const variantes = [
      variante("RECOGNITION", 3, "2026-01-01"),
      variante("MECHANISM", 1, "2026-01-02"),
      variante("BOUNDARY", 2, "2026-01-03"),
    ];

    expect(premiereEquivalente(variantes, null)?.facet).toBe("MECHANISM");
  });

  it("départage deux facettes à égalité par la plus ancienne", () => {
    const variantes = [
      variante("RECOGNITION", 2, "2026-01-10"),
      variante("MECHANISM", 2, "2026-01-03"),
      variante("BOUNDARY", 2, "2026-01-07"),
    ];

    expect(premiereEquivalente(variantes, null)?.facet).toBe("MECHANISM");
  });

  it("fait passer une facette jamais servie avant une facette déjà vue", () => {
    const variantes = [variante("RECOGNITION", 0, "2026-01-01"), variante("MECHANISM", 0, null)];

    expect(premiereEquivalente(variantes, null)?.facet).toBe("MECHANISM");
  });

  it("ne sert jamais deux fois la même facette d'affilée", () => {
    // La moins vue est aussi celle qui vient d'être servie : elle cède la place.
    const variantes = [
      variante("RECOGNITION", 0, "2026-01-10"),
      variante("MECHANISM", 5, "2026-01-02"),
    ];

    expect(premiereEquivalente(variantes, "RECOGNITION")?.facet).toBe("MECHANISM");
  });

  it("repose la seule facette restante plutôt que de ne rien poser", () => {
    const variantes = [variante("RECOGNITION", 4, "2026-01-10")];

    expect(premiereEquivalente(variantes, "RECOGNITION")?.facet).toBe("RECOGNITION");
  });

  it("rend le même choix pour la même entrée", () => {
    const variantes = lotNeuf();

    expect(premiereEquivalente(variantes, null)).toEqual(premiereEquivalente(variantes, null));
  });

  it("parcourt les quatre facettes avant d'en répéter une", () => {
    let variantes = lotNeuf();
    let derniere: string | null = null;
    const servies: string[] = [];

    for (let tour = 0; tour < FACETTES.length; tour += 1) {
      const choisie = premiereEquivalente(variantes, derniere);

      if (!choisie) throw new Error("Une variante était attendue.");

      servies.push(choisie.facet);
      derniere = choisie.facet;
      variantes = variantes.map((v) =>
        v.id === choisie.id
          ? { ...v, sessionCount: v.sessionCount + 1, lastSessionAt: new Date(2026, 0, tour + 1) }
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
            sessionCount: fc.integer({ min: 0, max: 9 }),
            trainingCount: fc.integer({ min: 0, max: 30 }),
            vue: fc.integer({ min: 0, max: 40 }),
          }),
          { minLength: 1, maxLength: 12 },
        ),
        fc.constantFrom<string | null>(...FACETTES, null),
        (entrees, derniere) => {
          const variantes = entrees.map((entree, rang) => ({
            id: `v-${rang}`,
            facet: entree.facet,
            sessionCount: entree.sessionCount,
            trainingCount: entree.trainingCount,
            lastSessionAt: new Date(2026, 0, 1 + entree.vue),
          }));

          const choisie = premiereEquivalente(variantes, derniere);

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

describe("variantesEquivalentes et les deux compteurs", () => {
  it("ne regarde pas les passages d'entraînement pour choisir", () => {
    // La première a été tournée vingt fois à l'entraînement, la seconde jamais.
    // Si l'entraînement pesait sur la rotation, c'est la seconde qui sortirait.
    const variantes = [
      variante("RECOGNITION", 0, "2026-01-01", 20),
      variante("MECHANISM", 1, "2026-01-02", 0),
    ];

    expect(premiereEquivalente(variantes, null)?.facet).toBe("RECOGNITION");
  });

  it("rend le même choix quel que soit l'usage en entraînement", () => {
    fc.assert(
      fc.property(
        fc.array(fc.nat({ max: 50 }), { minLength: 4, maxLength: 4 }),
        (entrainements) => {
          const sans = FACETTES.map((facet, rang) => variante(facet, rang, "2026-01-01", 0));
          const avec = sans.map((v, rang) => ({ ...v, trainingCount: entrainements[rang] ?? 0 }));

          return premiereEquivalente(sans, null)?.id === premiereEquivalente(avec, null)?.id;
        },
      ),
      { numRuns: 200 },
    );
  });
});
