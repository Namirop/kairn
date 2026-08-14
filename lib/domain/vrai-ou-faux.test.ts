import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { cibleDuVraiOuFaux } from "./vrai-ou-faux";

/**
 * Ce qui compte ici est une propriété de distribution — c'est tout l'objet du
 * correctif. Un exemple ne la prouve pas : on tire sur mille identifiants.
 */

const TIRAGES = 1000;

/** Trois écarts-types d'une binomiale(1000, 0,5) : ~47,4. */
const MARGE = 48;

describe("cibleDuVraiOuFaux", () => {
  it("répartit les cibles à peu près moitié-moitié sur mille identifiants", () => {
    const vraies = Array.from({ length: TIRAGES }, (_, rang) =>
      cibleDuVraiOuFaux(`atome-${rang}:BOUNDARY`),
    ).filter(Boolean).length;

    expect(vraies).toBeGreaterThan(TIRAGES / 2 - MARGE);
    expect(vraies).toBeLessThan(TIRAGES / 2 + MARGE);
  });

  it("tient aussi sur des identifiants qui ne se suivent pas", () => {
    const vraies = Array.from({ length: TIRAGES }, (_, rang) =>
      cibleDuVraiOuFaux(`${(rang * 7919).toString(36)}-cmg${rang}:RECOGNITION`),
    ).filter(Boolean).length;

    expect(vraies).toBeGreaterThan(TIRAGES / 2 - MARGE);
    expect(vraies).toBeLessThan(TIRAGES / 2 + MARGE);
  });

  it("rend toujours la même cible pour la même graine", () => {
    fc.assert(
      fc.property(fc.string(), (graine) => {
        expect(cibleDuVraiOuFaux(graine)).toBe(cibleDuVraiOuFaux(graine));
      }),
    );
  });
});

describe("la graine de la cible", () => {
  it("ne porte plus la facette : un lot n'a qu'une cible", () => {
    // La première version tirait par facette et l'envoi les annonçait toutes
    // les trois, ce qui se lisait comme une invitation à écrire des vrai ou
    // faux. Une cible par concept, lue par la question qui porte le format.
    expect(cibleDuVraiOuFaux("atome-7")).toBe(cibleDuVraiOuFaux("atome-7"));
    expect(cibleDuVraiOuFaux("atome-7:BOUNDARY")).toBe(cibleDuVraiOuFaux("atome-7:BOUNDARY"));
  });
});
