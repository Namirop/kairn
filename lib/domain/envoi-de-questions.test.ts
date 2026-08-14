import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { messageDuGroupe } from "./envoi-de-questions";
import { cibleDuVraiOuFaux } from "./vrai-ou-faux";

const envoi = [
  { graine: "atome-un", concept: "Le fond épais supprime le point brûlant." },
  { graine: "atome-deux", concept: "Une nuit compte quatre à six cycles." },
];

describe("messageDuGroupe", () => {
  it("numérote les concepts à partir de un", () => {
    const message = messageDuGroupe(envoi);

    expect(message).toContain("Concept 1.");
    expect(message).toContain("Concept 2.");
    expect(message).not.toContain("Concept 0.");
  });

  it("recopie le concept sans le toucher", () => {
    expect(messageDuGroupe(envoi)).toContain("Le fond épais supprime le point brûlant.");
  });

  it("annonce la cible du lot, une seule fois par concept", () => {
    const message = messageDuGroupe([envoi[0]!]);
    const vraie = cibleDuVraiOuFaux("atome-un") ? "vraie" : "fausse";

    expect(message).toContain(`son affirmation doit être ${vraie}`);
  });

  it("ne nomme aucune facette", () => {
    // La table des facettes ouvertes au vrai ou faux se lisait comme une
    // consigne d'en écrire : le format a doublé sa part du corpus en un
    // passage. L'envoi ne désigne plus rien.
    const message = messageDuGroupe(envoi);

    for (const facette of ["recognition", "mechanism", "boundary", "application"]) {
      expect(message).not.toContain(facette);
    }
  });

  it("donne des cibles différentes à deux concepts, le plus souvent", () => {
    const lignes = Array.from(
      { length: 200 },
      (_, rang) => messageDuGroupe([{ graine: `atome-${rang}`, concept: "x" }]).split("\n")[2],
    );

    expect(new Set(lignes).size).toBeGreaterThan(1);
  });

  it("rend le même message pour le même envoi", () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({ graine: fc.string(), concept: fc.string() }), { maxLength: 3 }),
        (concepts) => {
          expect(messageDuGroupe(concepts)).toBe(messageDuGroupe(concepts));
        },
      ),
    );
  });
});
