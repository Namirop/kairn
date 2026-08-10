import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { PASSAGES_POUR_LE_SIGNAL, signalDeMaitrise, type PassageJuge } from "./signal-maitrise";

function reussite(tempsMs: number): PassageJuge {
  return { reussi: true, tempsMs };
}

function echec(tempsMs: number): PassageJuge {
  return { reussi: false, tempsMs };
}

describe("signalDeMaitrise", () => {
  it("se déclenche sur trois réussites qui accélèrent", () => {
    const signal = signalDeMaitrise([reussite(12_000), reussite(7_000), reussite(3_000)]);

    expect(signal).toEqual({ depuisMs: 12_000, versMs: 3_000, gainMs: 9_000 });
  });

  it("ne se déclenche pas sur trois réussites qui ralentissent", () => {
    expect(signalDeMaitrise([reussite(3_000), reussite(7_000), reussite(12_000)])).toBeNull();
  });

  it("ne se déclenche pas sur trois réussites au même rythme", () => {
    expect(signalDeMaitrise([reussite(5_000), reussite(5_000), reussite(5_000)])).toBeNull();
  });

  it("ne se déclenche pas sur une série interrompue par un échec", () => {
    expect(signalDeMaitrise([reussite(12_000), echec(7_000), reussite(3_000)])).toBeNull();
  });

  it("ne se déclenche pas quand une seule mesure stagne", () => {
    // Deux accélérations et un palier : la série n'est pas strictement décroissante.
    expect(signalDeMaitrise([reussite(12_000), reussite(7_000), reussite(7_000)])).toBeNull();
  });

  it("attend d'avoir assez de passages", () => {
    expect(signalDeMaitrise([reussite(9_000), reussite(4_000)])).toBeNull();
    expect(signalDeMaitrise([])).toBeNull();
  });

  it("ne juge que les derniers passages", () => {
    // Un vieil échec et un vieux ralentissement ne condamnent pas la série en cours.
    const signal = signalDeMaitrise([
      echec(20_000),
      reussite(30_000),
      reussite(12_000),
      reussite(7_000),
      reussite(3_000),
    ]);

    expect(signal?.gainMs).toBe(9_000);
  });

  it("ne se déclenche pas si le dernier passage a échoué, même après une accélération", () => {
    expect(signalDeMaitrise([reussite(12_000), reussite(7_000), echec(1_000)])).toBeNull();
  });
});

describe("propriétés", () => {
  it("annonce toujours un gain strictement positif quand il se déclenche", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({ reussi: fc.boolean(), tempsMs: fc.integer({ min: 100, max: 60_000 }) }),
          { maxLength: 12 },
        ),
        (passages) => {
          const signal = signalDeMaitrise(passages);

          if (!signal) return true;

          return signal.gainMs > 0 && signal.depuisMs > signal.versMs;
        },
      ),
      { numRuns: 400 },
    );
  });

  it("ne se déclenche jamais quand un des derniers passages a échoué", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({ reussi: fc.boolean(), tempsMs: fc.integer({ min: 100, max: 60_000 }) }),
          { minLength: PASSAGES_POUR_LE_SIGNAL, maxLength: 12 },
        ),
        (passages) => {
          const derniers = passages.slice(-PASSAGES_POUR_LE_SIGNAL);

          if (derniers.every((passage) => passage.reussi)) return true;

          return signalDeMaitrise(passages) === null;
        },
      ),
      { numRuns: 400 },
    );
  });

  it("se déclenche sur toute série strictement décroissante de réussites", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1_000, max: 60_000 }),
        fc.integer({ min: 1, max: 900 }),
        fc.integer({ min: 1, max: 900 }),
        (depart, premierEcart, secondEcart) => {
          const passages = [
            reussite(depart + premierEcart + secondEcart),
            reussite(depart + secondEcart),
            reussite(depart),
          ];

          return signalDeMaitrise(passages)?.gainMs === premierEcart + secondEcart;
        },
      ),
      { numRuns: 300 },
    );
  });
});
