import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  avancementDuNiveau,
  progressionPourXp,
  serieApresPassage,
  xpDuNiveau,
  xpDuPassage,
  XP_DU_PREMIER_PALIER,
} from "./progression";

describe("xpDuPassage", () => {
  it("donne une unité pour être venu, quel que soit le résultat", () => {
    expect(xpDuPassage(false, true)).toBe(1);
    expect(xpDuPassage(false, false)).toBe(1);
  });

  it("ajoute le rattrapage sur un concept raté puis retrouvé", () => {
    expect(xpDuPassage(true, true)).toBe(2);
  });

  it("ne donne pas le rattrapage quand le concept rate encore", () => {
    expect(xpDuPassage(true, false)).toBe(1);
  });

  it("ne punit jamais un échec", () => {
    fc.assert(
      fc.property(fc.boolean(), fc.boolean(), (rate, reussi) => xpDuPassage(rate, reussi) >= 1),
    );
  });
});

describe("xpDuNiveau", () => {
  it("pose le premier niveau à zéro", () => {
    expect(xpDuNiveau(1)).toBe(0);
  });

  it("fait coûter le second palier le montant annoncé", () => {
    expect(xpDuNiveau(2)).toBe(XP_DU_PREMIER_PALIER);
  });

  it("rend chaque palier plus cher que le précédent", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 400 }), (niveau) => {
        const palier = xpDuNiveau(niveau + 1) - xpDuNiveau(niveau);
        const suivant = xpDuNiveau(niveau + 2) - xpDuNiveau(niveau + 1);

        return suivant > palier;
      }),
      { numRuns: 200 },
    );
  });
});

describe("progressionPourXp", () => {
  it("part du niveau 1 à zéro", () => {
    expect(progressionPourXp(0)).toEqual({ niveau: 1, seuilDuNiveau: 0, seuilSuivant: 20 });
  });

  it("passe au niveau suivant au seuil pile, jamais avant", () => {
    expect(progressionPourXp(XP_DU_PREMIER_PALIER - 1).niveau).toBe(1);
    expect(progressionPourXp(XP_DU_PREMIER_PALIER).niveau).toBe(2);
  });

  it("traite une XP négative comme une XP nulle", () => {
    expect(progressionPourXp(-50).niveau).toBe(1);
  });

  it("encadre toujours l'XP entre les deux seuils", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 5_000_000 }), (xp) => {
        const { niveau, seuilDuNiveau, seuilSuivant } = progressionPourXp(xp);

        return niveau >= 1 && seuilDuNiveau <= xp && xp < seuilSuivant;
      }),
      { numRuns: 500 },
    );
  });

  it("ne redescend jamais quand l'XP monte", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100_000 }),
        fc.integer({ min: 0, max: 100_000 }),
        (une, deux) => {
          const [petit, grand] = une <= deux ? [une, deux] : [deux, une];

          return progressionPourXp(petit).niveau <= progressionPourXp(grand).niveau;
        },
      ),
      { numRuns: 300 },
    );
  });
});

describe("serieApresPassage", () => {
  it("démarre à un sur un premier passage", () => {
    expect(serieApresPassage(null, "2026-03-10", 0)).toBe(1);
  });

  it("allonge la série au lendemain", () => {
    expect(serieApresPassage("2026-03-09", "2026-03-10", 4)).toBe(5);
  });

  it("ne compte pas deux fois le même jour", () => {
    expect(serieApresPassage("2026-03-10", "2026-03-10", 4)).toBe(4);
  });

  it("repart à un après un jour sauté", () => {
    expect(serieApresPassage("2026-03-08", "2026-03-10", 9)).toBe(1);
  });

  it("enjambe un changement de mois et une année bissextile", () => {
    expect(serieApresPassage("2026-02-28", "2026-03-01", 2)).toBe(3);
    expect(serieApresPassage("2028-02-28", "2028-02-29", 2)).toBe(3);
    expect(serieApresPassage("2028-02-29", "2028-03-01", 3)).toBe(4);
  });

  /**
   * Le passage à l'heure d'été : la journée locale ne fait pas 24 h, mais
   * l'étiquette du jour avance quand même d'un cran.
   */
  it("tient les journées de 23 et 25 heures", () => {
    expect(serieApresPassage("2026-03-28", "2026-03-29", 1)).toBe(2);
    expect(serieApresPassage("2026-10-24", "2026-10-25", 1)).toBe(2);
  });

  it("ne rend jamais une série nulle ni négative", () => {
    fc.assert(
      fc.property(
        fc.option(fc.constantFrom("2026-03-08", "2026-03-09", "2026-03-10"), { nil: null }),
        fc.integer({ min: -5, max: 500 }),
        (dernier, serie) => serieApresPassage(dernier, "2026-03-10", serie) >= 1,
      ),
      { numRuns: 200 },
    );
  });
});

describe("avancementDuNiveau", () => {
  it("part de zéro à l'entrée d'un palier", () => {
    // 20 XP ouvre le niveau 2 : on y entre à peine, rien n'est parcouru.
    expect(avancementDuNiveau(XP_DU_PREMIER_PALIER)).toEqual({
      niveau: 2,
      part: 0,
      restant: xpDuNiveau(3) - XP_DU_PREMIER_PALIER,
    });
  });

  it("compte un compte neuf comme un palier entamé, pas comme un niveau acquis", () => {
    const debut = avancementDuNiveau(0);

    expect(debut.niveau).toBe(1);
    expect(debut.part).toBe(0);
    expect(debut.restant).toBe(XP_DU_PREMIER_PALIER);
  });

  it("rend la moitié du palier à mi-chemin", () => {
    // Le palier du niveau 2 va de 20 à 60 : 40 XP en est le milieu.
    const milieu = avancementDuNiveau(40);

    expect(milieu.niveau).toBe(2);
    expect(milieu.part).toBeCloseTo(0.5, 10);
    expect(milieu.restant).toBe(20);
  });

  it("traite une XP négative comme une XP nulle", () => {
    expect(avancementDuNiveau(-50)).toEqual(avancementDuNiveau(0));
  });

  /**
   * La part est une part : elle ne sort jamais de son intervalle, et le reste
   * ne devient jamais négatif. Une barre de progression qui déborde ou un
   * « il te reste -3 XP » sont deux façons de perdre la confiance d'un coup.
   */
  it("reste dans ses bornes pour n'importe quelle XP", () => {
    fc.assert(
      fc.property(fc.integer({ min: -1000, max: 5_000_000 }), (xp) => {
        const { part, restant, niveau } = avancementDuNiveau(xp);

        expect(part).toBeGreaterThanOrEqual(0);
        expect(part).toBeLessThanOrEqual(1);
        expect(restant).toBeGreaterThanOrEqual(0);
        expect(niveau).toBeGreaterThanOrEqual(1);
        expect(Number.isFinite(part)).toBe(true);
      }),
      { numRuns: 300 },
    );
  });

  it("avance sans jamais reculer quand l'XP monte", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100_000 }),
        fc.integer({ min: 1, max: 5000 }),
        (xp, gain) => {
          const avant = avancementDuNiveau(xp);
          const apres = avancementDuNiveau(xp + gain);

          // Soit on progresse dans le même palier, soit on en a changé.
          expect(apres.niveau > avant.niveau || apres.part >= avant.part - 1e-12).toBe(true);
        },
      ),
      { numRuns: 300 },
    );
  });
});
