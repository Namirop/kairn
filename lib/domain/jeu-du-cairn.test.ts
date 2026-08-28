import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  periodeDuRang,
  PIERRES_DU_JEU,
  poserLaPierre,
  positionDuBalancier,
  TOLERANCE,
} from "./jeu-du-cairn";

const PERIODE = fc.double({ min: 1, max: 5000, noNaN: true });
const TEMPS = fc.double({ min: 0, max: 200_000, noNaN: true });

describe("positionDuBalancier", () => {
  it("part du bord gauche et touche le bord droit à mi-course", () => {
    expect(positionDuBalancier(0, 1000, 10, 90)).toBeCloseTo(10);
    expect(positionDuBalancier(500, 1000, 10, 90)).toBeCloseTo(90);
    expect(positionDuBalancier(1000, 1000, 10, 90)).toBeCloseTo(10);
  });

  it("avance à vitesse constante : le quart du temps fait la moitié du chemin", () => {
    expect(positionDuBalancier(250, 1000, 0, 100)).toBeCloseTo(50);
    expect(positionDuBalancier(750, 1000, 0, 100)).toBeCloseTo(50);
  });

  it("ne sort jamais de son cadre", () => {
    fc.assert(
      fc.property(TEMPS, PERIODE, (temps, periode) => {
        const x = positionDuBalancier(temps, periode, 20, 80);

        expect(x).toBeGreaterThanOrEqual(20);
        expect(x).toBeLessThanOrEqual(80);
      }),
    );
  });

  it("se répète à chaque période", () => {
    fc.assert(
      fc.property(TEMPS, PERIODE, (temps, periode) => {
        expect(positionDuBalancier(temps + periode, periode, 20, 80)).toBeCloseTo(
          positionDuBalancier(temps, periode, 20, 80),
          6,
        );
      }),
    );
  });

  it("revient par où il est allé", () => {
    fc.assert(
      fc.property(PERIODE, fc.double({ min: 0, max: 1, noNaN: true }), (periode, part) => {
        const temps = periode * part;

        expect(positionDuBalancier(periode - temps, periode, 20, 80)).toBeCloseTo(
          positionDuBalancier(temps, periode, 20, 80),
          6,
        );
      }),
    );
  });

  it("tient un temps négatif sans sortir du cadre", () => {
    expect(positionDuBalancier(-250, 1000, 0, 100)).toBeCloseTo(50);
  });

  it("s'immobilise quand il n'y a nulle part où aller", () => {
    expect(positionDuBalancier(123, 1000, 50, 50)).toBe(50);
    expect(positionDuBalancier(123, 0, 10, 90)).toBe(10);
  });
});

describe("periodeDuRang", () => {
  it("accélère du premier au dernier rang", () => {
    expect(periodeDuRang(0)).toBeGreaterThan(periodeDuRang(PIERRES_DU_JEU - 1));
  });

  it("ne s'accélère jamais entre deux rangs voisins qu'en descendant", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: PIERRES_DU_JEU - 2 }), (rang) => {
        expect(periodeDuRang(rang + 1)).toBeLessThanOrEqual(periodeDuRang(rang));
      }),
    );
  });

  it("borne les rangs absurdes plutôt que de les extrapoler", () => {
    expect(periodeDuRang(-5)).toBe(periodeDuRang(0));
    expect(periodeDuRang(99)).toBe(periodeDuRang(PIERRES_DU_JEU - 1));
  });

  it("tient un jeu d'une seule pierre", () => {
    expect(periodeDuRang(0, 1)).toBeGreaterThan(0);
  });
});

describe("poserLaPierre", () => {
  it("cale la pierre sur sa cible quand elle est dans la tolérance", () => {
    expect(poserLaPierre(52, 50)).toEqual({ x: 50, dAplomb: true });
  });

  it("compte la tolérance exacte comme une réussite", () => {
    expect(poserLaPierre(50 + TOLERANCE, 50)).toEqual({ x: 50, dAplomb: true });
  });

  it("laisse la pierre où on l'a lâchée quand elle est à côté", () => {
    expect(poserLaPierre(61, 50)).toEqual({ x: 61, dAplomb: false });
  });

  it("ne rend jamais autre chose que la cible ou la position lâchée", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 100, noNaN: true }),
        fc.double({ min: 0, max: 100, noNaN: true }),
        (x, cible) => {
          const posee = poserLaPierre(x, cible);

          expect(posee.dAplomb ? posee.x === cible : posee.x === x).toBe(true);
        },
      ),
    );
  });

  it("dit d'aplomb exactement quand l'écart tient dans la tolérance", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 100, noNaN: true }),
        fc.double({ min: 0, max: 100, noNaN: true }),
        (x, cible) => {
          expect(poserLaPierre(x, cible).dAplomb).toBe(Math.abs(x - cible) <= TOLERANCE);
        },
      ),
    );
  });

  it("n'accepte plus rien qu'une visée exacte si la tolérance est nulle", () => {
    expect(poserLaPierre(50.5, 50, 0).dAplomb).toBe(false);
    expect(poserLaPierre(50, 50, 0).dAplomb).toBe(true);
  });
});
