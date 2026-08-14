import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { messageDuGroupe } from "./envoi-de-questions";
import { ciblesDuLot } from "./vrai-ou-faux";

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

  it("annonce la cible de chaque facette qui peut porter un vrai ou faux", () => {
    const message = messageDuGroupe([envoi[0]!]);

    for (const { facette, vraie } of ciblesDuLot("atome-un")) {
      expect(message).toContain(`${facette} : ${vraie ? "vraie" : "fausse"}`);
    }
  });

  it("ne parle pas de mechanism, qui ne peut pas porter de vrai ou faux", () => {
    expect(messageDuGroupe(envoi)).not.toContain("mechanism");
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
