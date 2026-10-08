import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { ETAPES, type EtapeDeLAttente } from "./catalogue-dattente";
import type { LangueDuProduit } from "./langue-du-produit";
import { paliersDe, phraseDattente, RELEVE_MS } from "./phrases-dattente";

/** Le tirage vient de `Math.random()`, donc [0, 1) — plus les bornes à éprouver. */
const tirage = fc.double({ min: 0, max: 1, noNaN: true, maxExcluded: true });
const etape = fc.constantFrom(...ETAPES);

const LANGUES: LangueDuProduit[] = ["FR", "EN"];

describe.each(LANGUES)("en %s", (langue) => {
  const phrasesDe = (quand: EtapeDeLAttente) =>
    paliersDe(quand, langue).flatMap((palier) => palier.phrases);

  const TOUTES = ETAPES.flatMap(phrasesDe);

  describe("phraseDattente", () => {
    it("rend toujours une phrase du catalogue de son étape, à n'importe quel instant", () => {
      fc.assert(
        fc.property(
          etape,
          fc.double({ min: -5_000, max: 200_000, noNaN: true }),
          tirage,
          (quand, ecoule, tire) =>
            phrasesDe(quand).includes(phraseDattente(quand, ecoule, tire, langue)),
        ),
        { numRuns: 500 },
      );
    });

    it("rend la même phrase pour la même étape, le même instant et le même tirage", () => {
      fc.assert(
        fc.property(
          etape,
          fc.double({ min: 0, max: 120_000, noNaN: true }),
          tirage,
          (quand, ecoule, tire) => {
            expect(phraseDattente(quand, ecoule, tire, langue)).toBe(
              phraseDattente(quand, ecoule, tire, langue),
            );
          },
        ),
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
        fc.property(etape, fc.integer({ min: 0, max: 25 }), tirage, (quand, releve, tire) => {
          const ici = phraseDattente(quand, releve * RELEVE_MS, tire, langue);
          const apres = phraseDattente(quand, (releve + 1) * RELEVE_MS, tire, langue);

          expect(apres).not.toBe(ici);
        }),
        { numRuns: 300 },
      );
    });

    it("ouvre sur le premier palier et finit sur le dernier", () => {
      for (const quand of ETAPES) {
        const paliers = paliersDe(quand, langue);

        expect(paliers[0].phrases).toContain(phraseDattente(quand, 0, 0, langue));
        expect(paliers[paliers.length - 1]?.phrases).toContain(
          phraseDattente(quand, 89_000, 0, langue),
        );
      }
    });

    /**
     * Le ton descend, et il ne remonte pas : une attente qui dure ne doit jamais
     * repasser par « on lit ce que tu as déposé ». Le palier atteint est donc une
     * fonction croissante du temps.
     */
    it("ne revient jamais à un palier antérieur", () => {
      fc.assert(
        fc.property(
          etape,
          fc.double({ min: 0, max: 89_000, noNaN: true }),
          fc.double({ min: 0, max: 89_000, noNaN: true }),
          tirage,
          (quand, a, b, tire) => {
            const paliers = paliersDe(quand, langue);
            const palierDe = (phrase: string) =>
              paliers.findIndex((palier) => palier.phrases.includes(phrase));
            const [tot, tard] = a <= b ? [a, b] : [b, a];

            expect(palierDe(phraseDattente(quand, tard, tire, langue))).toBeGreaterThanOrEqual(
              palierDe(phraseDattente(quand, tot, tire, langue)),
            );
          },
        ),
        { numRuns: 300 },
      );
    });

    it("change de séquence selon le tirage", () => {
      const sequences = new Set(
        Array.from({ length: 20 }, (_, rang) => phraseDattente("DECOUPAGE", 0, rang / 20, langue)),
      );

      expect(sequences.size).toBeGreaterThan(1);
    });

    /**
     * Les trois étapes ne parlent pas à la même personne : à la lecture le texte
     * n'existe pas encore, au découpage on n'a rien vu, à l'écriture les concepts
     * sont déjà à l'écran. Une phrase partagée serait fausse dans l'une des trois.
     */
    it("ne partage aucune phrase entre deux étapes", () => {
      for (const ici of ETAPES) {
        const siennes = new Set(phrasesDe(ici));

        for (const ailleurs of ETAPES) {
          if (ailleurs === ici) continue;

          for (const phrase of phrasesDe(ailleurs)) expect(siennes.has(phrase)).toBe(false);
        }
      }
    });
  });

  describe("les catalogues", () => {
    /**
     * Le registre d'interface est une règle écrite, pas une intention : calme,
     * direct, sans point d'exclamation ni emoji. Une phrase drôle reste une phrase
     * de Kairn, et c'est le genre de ligne qu'on ajoute vite fait un soir.
     */
    it("tiennent le registre : pas d'exclamation, pas d'emoji, pas de phrase décapitée", () => {
      for (const phrase of TOUTES) {
        expect(phrase).not.toMatch(/!/);
        expect(phrase).not.toMatch(/\p{Extended_Pictographic}/u);
        expect(phrase).toMatch(/^[A-ZÀ-Ý]/);
        expect(phrase).toMatch(/[.…]$/);
      }
    });

    it("n'écrivent jamais deux fois la même phrase", () => {
      expect(new Set(TOUTES).size).toBe(TOUTES.length);
    });

    /** Une phrase qui déborde sa ligne réservée fait sauter la mise en page. */
    it("gardent des phrases courtes", () => {
      for (const phrase of TOUTES) {
        expect(phrase.length).toBeLessThanOrEqual(58);
      }
    });

    it("ouvrent chaque palier après le précédent, et le premier à zéro", () => {
      for (const quand of ETAPES) {
        const paliers = paliersDe(quand, langue);

        expect(paliers[0].depuisMs).toBe(0);

        for (const [rang, palier] of paliers.entries()) {
          if (rang === 0) continue;

          expect(palier.depuisMs).toBeGreaterThan(paliers[rang - 1]?.depuisMs ?? 0);
        }
      }
    });
  });
});

describe("les deux langues", () => {
  /** Même nombre de paliers et de phrases : un palier anglais plus court se répéterait plus vite. */
  it("ont la même forme, palier par palier", () => {
    for (const quand of ETAPES) {
      const fr = paliersDe(quand, "FR").map((palier) => palier.phrases.length);
      const en = paliersDe(quand, "EN").map((palier) => palier.phrases.length);

      expect(en).toEqual(fr);
    }
  });
});
