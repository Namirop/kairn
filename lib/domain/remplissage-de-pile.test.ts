import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { PIERRES_MAX, remplissageDePile } from "./remplissage-de-pile";

describe("remplissageDePile", () => {
  it("sous le plafond, une pierre vaut une question", () => {
    expect(remplissageDePile(0, 5)).toEqual({ pierres: 5, posees: 0, part: 0 });
    expect(remplissageDePile(2, 5)).toEqual({ pierres: 5, posees: 2, part: 0 });
    expect(remplissageDePile(5, 5)).toEqual({ pierres: 5, posees: 5, part: 0 });
  });

  it("au plafond exactement, rien ne change", () => {
    expect(remplissageDePile(3, PIERRES_MAX)).toEqual({ pierres: 7, posees: 3, part: 0 });
  });

  it("au-delà du plafond, la pile garde sa taille et la pierre en cours se comble", () => {
    const { pierres, posees, part } = remplissageDePile(1, 20);

    expect(pierres).toBe(7);
    expect(posees).toBe(0);
    expect(part).toBeCloseTo(0.35, 10);
  });

  it("au-delà du plafond, chaque réponse déplace quelque chose", () => {
    const avances = Array.from({ length: 21 }, (_, rang) => {
      const { posees, part } = remplissageDePile(rang, 20);

      return posees + part;
    });

    for (const [rang, avance] of avances.entries()) {
      if (rang === 0) continue;

      expect(avance).toBeGreaterThan(avances[rang - 1] ?? 0);
    }
  });

  it("la pile est pleine quand la session est finie", () => {
    expect(remplissageDePile(20, 20)).toEqual({ pierres: 7, posees: 7, part: 0 });
    expect(remplissageDePile(9, 9, 4)).toEqual({ pierres: 4, posees: 4, part: 0 });
  });

  it("une pile dessine au moins une pierre, même sans question", () => {
    expect(remplissageDePile(0, 0)).toEqual({ pierres: 1, posees: 0, part: 0 });
  });

  it("borne un rang absurde plutôt que de sortir de la pile", () => {
    expect(remplissageDePile(-3, 5)).toEqual({ pierres: 5, posees: 0, part: 0 });
    expect(remplissageDePile(99, 5)).toEqual({ pierres: 5, posees: 5, part: 0 });
  });
});

describe("propriétés", () => {
  const rang = fc.integer({ min: -5, max: 40 });
  const total = fc.integer({ min: 0, max: 40 });

  it("la part reste dans [0, 1[ et les pierres posées dans la pile", () => {
    fc.assert(
      fc.property(rang, total, (r, t) => {
        const { pierres, posees, part } = remplissageDePile(r, t);

        return part >= 0 && part < 1 && posees >= 0 && posees <= pierres && pierres <= PIERRES_MAX;
      }),
      { numRuns: 400 },
    );
  });

  it("sous le plafond, aucune pierre n'est à moitié comblée", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: PIERRES_MAX }), (t) => {
        return Array.from({ length: t + 1 }, (_, r) => remplissageDePile(r, t)).every(
          (remplissage, r) => remplissage.part === 0 && remplissage.posees === r,
        );
      }),
      { numRuns: 100 },
    );
  });

  it("avancer ne fait jamais reculer la pile", () => {
    fc.assert(
      fc.property(total, (t) => {
        const avances = Array.from({ length: t + 2 }, (_, r) => {
          const { posees, part } = remplissageDePile(r, t);

          return posees + part;
        });

        return avances.every((avance, r) => r === 0 || avance >= (avances[r - 1] ?? 0));
      }),
      { numRuns: 200 },
    );
  });
});
