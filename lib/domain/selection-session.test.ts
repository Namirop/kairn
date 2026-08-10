import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  alternerLesSujets,
  composerSession,
  dejaRevuAujourdhui,
  estDu,
  type ConceptDu,
} from "./selection-session";

const PARIS = "Europe/Paris";
const LOS_ANGELES = "America/Los_Angeles";
const KATMANDOU = "Asia/Kathmandu";

function concept(
  id: string,
  due: string,
  tags: string[] = [],
  inputId = "depot",
  lastReview: string | null = null,
): ConceptDu {
  return {
    id,
    due: new Date(due),
    tags,
    inputId,
    lastReview: lastReview ? new Date(lastReview) : null,
  };
}

describe("estDu", () => {
  it("compare des jours civils, pas des instants", () => {
    // 23 h 00 UTC le 14 : déjà le 15 à Paris, encore le 14 en UTC.
    const echeance = new Date("2026-01-14T23:00:00Z");
    const maintenant = new Date("2026-01-14T23:30:00Z");

    expect(estDu(echeance, maintenant, PARIS)).toBe(true);
    expect(estDu(echeance, maintenant, "UTC")).toBe(true);
  });

  it("tient une échéance du lendemain à l'est de l'UTC", () => {
    // 22 h 00 UTC le 15 = 03 h 45 le 16 à Katmandou : l'utilisateur est déjà le
    // 16, une échéance au 16 est donc échue pour lui.
    const echeance = new Date("2026-01-16T04:00:00Z");
    const maintenant = new Date("2026-01-15T22:00:00Z");

    expect(estDu(echeance, maintenant, KATMANDOU)).toBe(true);
    expect(estDu(echeance, maintenant, "UTC")).toBe(false);
  });

  it("tient la même échéance à l'ouest de l'UTC", () => {
    // 01 h 00 UTC le 16 = 17 h 00 le 15 à Los Angeles : il est encore le 15,
    // une échéance au 16 n'est pas due.
    const echeance = new Date("2026-01-16T12:00:00Z");
    const maintenant = new Date("2026-01-16T01:00:00Z");

    expect(estDu(echeance, maintenant, LOS_ANGELES)).toBe(false);
    expect(estDu(echeance, maintenant, "UTC")).toBe(true);
  });

  it("reste vrai sur une échéance dépassée depuis des jours", () => {
    expect(estDu(new Date("2026-01-10T08:00:00Z"), new Date("2026-01-15T08:00:00Z"), PARIS)).toBe(
      true,
    );
  });

  it("passe au jour suivant à minuit local, pas à minuit UTC", () => {
    const echeance = new Date("2026-01-15T12:00:00Z");
    // 23 h 30 UTC le 14 = 00 h 30 le 15 à Paris : l'échéance du 15 devient due.
    const avantMinuitUtc = new Date("2026-01-14T23:30:00Z");

    expect(estDu(echeance, avantMinuitUtc, PARIS)).toBe(true);
    expect(estDu(echeance, avantMinuitUtc, "UTC")).toBe(false);
  });
});

describe("alternerLesSujets", () => {
  it("ne sert jamais deux fois le même sujet d'affilée quand un autre attend", () => {
    const concepts = [
      concept("a1", "2026-01-01", ["postgres"]),
      concept("a2", "2026-01-01", ["postgres"]),
      concept("a3", "2026-01-01", ["postgres"]),
      concept("b1", "2026-01-01", ["react"]),
      concept("b2", "2026-01-01", ["react"]),
    ];

    const sujets = alternerLesSujets(concepts).map((c) => c.tags[0]);

    expect(sujets).toEqual(["postgres", "react", "postgres", "react", "postgres"]);
  });

  it("répète le sujet restant plutôt que de tronquer la session", () => {
    const concepts = [
      concept("a1", "2026-01-01", ["postgres"]),
      concept("a2", "2026-01-01", ["postgres"]),
      concept("a3", "2026-01-01", ["postgres"]),
      concept("b1", "2026-01-01", ["react"]),
    ];

    const ordonnes = alternerLesSujets(concepts);

    expect(ordonnes).toHaveLength(4);
    expect(new Set(ordonnes.map((c) => c.id)).size).toBe(4);
  });

  it("retombe sur le dépôt quand le concept n'a pas de tag", () => {
    const concepts = [
      concept("a1", "2026-01-01", [], "depot-1"),
      concept("a2", "2026-01-01", [], "depot-1"),
      concept("b1", "2026-01-01", [], "depot-2"),
    ];

    expect(alternerLesSujets(concepts).map((c) => c.inputId)).toEqual([
      "depot-1",
      "depot-2",
      "depot-1",
    ]);
  });

  it("rend le même ordre pour la même entrée", () => {
    const concepts = [
      concept("a1", "2026-01-01", ["postgres"]),
      concept("b1", "2026-01-01", ["react"]),
      concept("c1", "2026-01-01", ["http"]),
      concept("a2", "2026-01-01", ["postgres"]),
    ];

    expect(alternerLesSujets([...concepts])).toEqual(alternerLesSujets([...concepts]));
  });

  it("ne perd ni ne duplique aucun concept", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1, maxLength: 6 }),
            sujet: fc.constantFrom("a", "b", "c", "d"),
          }),
          { maxLength: 40 },
        ),
        (entrees) => {
          const concepts = entrees.map((entree, rang) =>
            concept(`${entree.id}-${rang}`, "2026-01-01", [entree.sujet]),
          );
          const ordonnes = alternerLesSujets(concepts);

          return (
            ordonnes.length === concepts.length &&
            new Set(ordonnes.map((c) => c.id)).size === concepts.length
          );
        },
      ),
      { numRuns: 300 },
    );
  });

  it("n'accole deux fois un sujet que lorsqu'il ne reste que lui", () => {
    fc.assert(
      fc.property(fc.array(fc.constantFrom("a", "b", "c"), { maxLength: 30 }), (sujets) => {
        const concepts = sujets.map((s, rang) => concept(`${s}-${rang}`, "2026-01-01", [s]));
        const ordonnes = alternerLesSujets(concepts);

        for (let rang = 1; rang < ordonnes.length; rang += 1) {
          const precedent = ordonnes[rang - 1]?.tags[0];
          const courant = ordonnes[rang]?.tags[0];

          if (precedent !== courant) continue;

          // Accolés : il faut qu'aucun autre sujet n'ait attendu son tour.
          const restants = ordonnes.slice(rang).map((c) => c.tags[0]);
          if (new Set(restants).size > 1) return false;
        }

        return true;
      }),
      { numRuns: 300 },
    );
  });
});

describe("composerSession", () => {
  it("ne retient que ce qui est échu et ne complète jamais", () => {
    const concepts = [
      concept("du-1", "2026-01-10T08:00:00Z", ["a"]),
      concept("du-2", "2026-01-14T08:00:00Z", ["b"]),
      concept("futur", "2026-01-20T08:00:00Z", ["c"]),
    ];

    const session = composerSession(concepts, new Date("2026-01-15T09:00:00Z"), PARIS);

    expect(session.map((c) => c.id).sort()).toEqual(["du-1", "du-2"]);
  });

  it("garde la plus dépassée quand le plafond coupe", () => {
    const concepts = [
      concept("vieux", "2026-01-01T08:00:00Z", ["a"]),
      concept("moyen", "2026-01-05T08:00:00Z", ["b"]),
      concept("frais", "2026-01-15T08:00:00Z", ["c"]),
    ];

    const session = composerSession(concepts, new Date("2026-01-15T09:00:00Z"), PARIS, 2);

    expect(session.map((c) => c.id).sort()).toEqual(["moyen", "vieux"]);
  });

  it("rend une session vide plutôt que d'avancer sur du non échu", () => {
    const concepts = [concept("futur", "2026-02-01T08:00:00Z", ["a"])];

    expect(composerSession(concepts, new Date("2026-01-15T09:00:00Z"), PARIS)).toEqual([]);
  });

  it("ne dépasse jamais le plafond, quel que soit le lot", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -40, max: 40 }), { maxLength: 60 }),
        fc.integer({ min: 0, max: 10 }),
        (decalages, plafond) => {
          const maintenant = new Date("2026-06-15T12:00:00Z");
          const concepts = decalages.map((jours, rang) =>
            concept(
              `c-${rang}`,
              new Date(maintenant.getTime() + jours * 24 * 60 * 60 * 1000).toISOString(),
              [`s${rang % 4}`],
            ),
          );

          return composerSession(concepts, maintenant, PARIS, plafond).length <= plafond;
        },
      ),
      { numRuns: 300 },
    );
  });
});

describe("dejaRevuAujourdhui", () => {
  it("est faux pour un concept jamais passé", () => {
    expect(dejaRevuAujourdhui(null, new Date("2026-01-15T09:00:00Z"), PARIS)).toBe(false);
  });

  it("est vrai dans la journée civile de l'utilisateur", () => {
    const passage = new Date("2026-01-15T07:00:00Z");

    expect(dejaRevuAujourdhui(passage, new Date("2026-01-15T21:00:00Z"), PARIS)).toBe(true);
  });

  it("redevient faux au minuit de l'utilisateur, pas à celui d'UTC", () => {
    const passage = new Date("2026-01-14T22:00:00Z");
    // 23 h 30 UTC le 14 : il est déjà 00 h 30 le 15 à Paris, donc un jour civil
    // plus tard — le concept est de nouveau proposable.
    const apresMinuitLocal = new Date("2026-01-14T23:30:00Z");

    expect(dejaRevuAujourdhui(passage, apresMinuitLocal, PARIS)).toBe(false);
    expect(dejaRevuAujourdhui(passage, apresMinuitLocal, "UTC")).toBe(true);
  });
});

describe("composerSession et le passage du jour", () => {
  it("ne repropose pas un concept déjà revu aujourd'hui", () => {
    // ts-fsrs replanifie un concept en apprentissage à quelques minutes : son
    // échéance est donc encore aujourd'hui, et il ne doit pas revenir pour autant.
    const concepts = [
      concept("revu", "2026-01-15T09:10:00Z", ["a"], "depot", "2026-01-15T09:00:00Z"),
      concept("pas-revu", "2026-01-15T08:00:00Z", ["b"]),
    ];

    const session = composerSession(concepts, new Date("2026-01-15T09:30:00Z"), PARIS);

    expect(session.map((c) => c.id)).toEqual(["pas-revu"]);
  });

  it("le repropose le lendemain", () => {
    const concepts = [
      concept("revu-hier", "2026-01-15T09:10:00Z", ["a"], "depot", "2026-01-15T09:00:00Z"),
    ];

    const session = composerSession(concepts, new Date("2026-01-16T09:30:00Z"), PARIS);

    expect(session.map((c) => c.id)).toEqual(["revu-hier"]);
  });
});
