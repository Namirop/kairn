import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { PALIERS_DATTENTE, phraseDattente, RELEVE_MS } from "./phrases-dattente";

const TOUTES = PALIERS_DATTENTE.flatMap((palier) => palier.phrases);

/** Le tirage vient de `Math.random()`, donc [0, 1) — plus les bornes à éprouver. */
const tirage = fc.double({ min: 0, max: 1, noNaN: true, maxExcluded: true });

describe("phraseDattente", () => {
  it("rend toujours une phrase du catalogue, à n'importe quel instant", () => {
    fc.assert(
      fc.property(fc.double({ min: -5_000, max: 200_000, noNaN: true }), tirage, (ecoule, tire) =>
        TOUTES.includes(phraseDattente(ecoule, tire)),
      ),
      { numRuns: 500 },
    );
  });

  it("rend la même phrase pour le même instant et le même tirage", () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 120_000, noNaN: true }), tirage, (ecoule, tire) => {
        expect(phraseDattente(ecoule, tire)).toBe(phraseDattente(ecoule, tire));
      }),
      { numRuns: 200 },
    );
  });

  /**
   * La propriété centrale : l'écran change à chaque relève.
   *
   * Elle tient aussi par-dessus les changements de palier, parce que le rang
   * avance indépendamment d'eux. C'est le seul endroit où une régression se
   * verrait tout de suite à l'écran — une phrase affichée deux fois de suite
   * ressemble à un écran figé, qui est exactement le défaut qu'on répare.
   */
  it("ne répète jamais la même phrase deux relèves de suite", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 25 }), tirage, (releve, tire) => {
        const ici = phraseDattente(releve * RELEVE_MS, tire);
        const apres = phraseDattente((releve + 1) * RELEVE_MS, tire);

        expect(apres).not.toBe(ici);
      }),
      { numRuns: 300 },
    );
  });

  it("ouvre sur le premier palier et finit sur le dernier", () => {
    const premier = PALIERS_DATTENTE[0];
    const dernier = PALIERS_DATTENTE[PALIERS_DATTENTE.length - 1];

    expect(premier.phrases).toContain(phraseDattente(0, 0));
    expect(dernier?.phrases).toContain(phraseDattente(89_000, 0));
  });

  /**
   * Le ton descend, et il ne remonte pas : une attente qui dure ne doit jamais
   * repasser par « on lit ce que tu as déposé ». Le palier atteint est donc une
   * fonction croissante du temps.
   */
  it("ne revient jamais à un palier antérieur", () => {
    const palierDe = (phrase: string) =>
      PALIERS_DATTENTE.findIndex((palier) => palier.phrases.includes(phrase));

    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 89_000, noNaN: true }),
        fc.double({ min: 0, max: 89_000, noNaN: true }),
        tirage,
        (a, b, tire) => {
          const [tot, tard] = a <= b ? [a, b] : [b, a];

          expect(palierDe(phraseDattente(tard, tire))).toBeGreaterThanOrEqual(
            palierDe(phraseDattente(tot, tire)),
          );
        },
      ),
      { numRuns: 300 },
    );
  });

  it("change de séquence selon le tirage", () => {
    const sequences = new Set(
      Array.from({ length: 20 }, (_, rang) => phraseDattente(0, rang / 20)),
    );

    expect(sequences.size).toBeGreaterThan(1);
  });
});

describe("le catalogue", () => {
  /**
   * Le registre d'interface est une règle écrite, pas une intention : calme,
   * direct, sans point d'exclamation ni emoji. Une phrase drôle reste une phrase
   * de Kairn, et c'est le genre de ligne qu'on ajoute vite fait un soir.
   */
  it("tient le registre : pas d'exclamation, pas d'emoji, pas de majuscules criées", () => {
    for (const phrase of TOUTES) {
      expect(phrase).not.toMatch(/!/);
      expect(phrase).not.toMatch(/\p{Extended_Pictographic}/u);
      expect(phrase).toMatch(/^[A-ZÀ-Ý]/);
      expect(phrase).toMatch(/[.…]$/);
    }
  });

  it("n'écrit jamais deux fois la même phrase", () => {
    expect(new Set(TOUTES).size).toBe(TOUTES.length);
  });

  /** Une phrase qui déborde sa ligne réservée fait sauter la mise en page. */
  it("garde des phrases courtes", () => {
    for (const phrase of TOUTES) {
      expect(phrase.length).toBeLessThanOrEqual(56);
    }
  });

  it("ouvre chaque palier après le précédent, et le premier à zéro", () => {
    expect(PALIERS_DATTENTE[0].depuisMs).toBe(0);

    for (const [rang, palier] of PALIERS_DATTENTE.entries()) {
      if (rang === 0) continue;

      expect(palier.depuisMs).toBeGreaterThan(PALIERS_DATTENTE[rang - 1]?.depuisMs ?? 0);
    }
  });
});
