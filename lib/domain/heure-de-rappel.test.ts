import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { ecrireHeureDeRappel, lireHeureDeRappel } from "./heure-de-rappel";

describe("lireHeureDeRappel", () => {
  it("lit les formes qu'on écrit vraiment", () => {
    expect(lireHeureDeRappel("8")).toBe(8);
    expect(lireHeureDeRappel("08")).toBe(8);
    expect(lireHeureDeRappel("8h")).toBe(8);
    expect(lireHeureDeRappel("8 h")).toBe(8);
    expect(lireHeureDeRappel("8h00")).toBe(8);
    expect(lireHeureDeRappel("08:00")).toBe(8);
    expect(lireHeureDeRappel(" 20 h 00 ")).toBe(20);
    expect(lireHeureDeRappel("20H")).toBe(20);
  });

  it("accepte les deux bouts de la journée", () => {
    expect(lireHeureDeRappel("0")).toBe(0);
    expect(lireHeureDeRappel("00:00")).toBe(0);
    expect(lireHeureDeRappel("23")).toBe(23);
  });

  it("refuse une heure qui n'existe pas", () => {
    expect(lireHeureDeRappel("24")).toBe(null);
    expect(lireHeureDeRappel("99")).toBe(null);
    expect(lireHeureDeRappel("-1")).toBe(null);
  });

  it("refuse des minutes, plutôt que de les arrondir en silence", () => {
    // Le passage qui envoie est horaire : « 20 h 30 » ne pourrait pas être tenu.
    expect(lireHeureDeRappel("20h30")).toBe(null);
    expect(lireHeureDeRappel("8:45")).toBe(null);
  });

  it("refuse ce qui n'est pas une heure", () => {
    expect(lireHeureDeRappel("")).toBe(null);
    expect(lireHeureDeRappel("le matin")).toBe(null);
    expect(lireHeureDeRappel("8 heures et demie")).toBe(null);
    expect(lireHeureDeRappel("8pm")).toBe(null);
  });

  it("relit toujours ce qu'elle vient d'écrire", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 23 }), (heure) => {
        return lireHeureDeRappel(ecrireHeureDeRappel(heure)) === heure;
      }),
      { numRuns: 24 },
    );
  });

  it("ne rend jamais autre chose qu'une heure de la journée", () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 12 }), (saisie) => {
        const heure = lireHeureDeRappel(saisie);

        return heure === null || (Number.isInteger(heure) && heure >= 0 && heure <= 23);
      }),
      { numRuns: 500 },
    );
  });
});

describe("ecrireHeureDeRappel", () => {
  it("écrit l'heure comme on la dit", () => {
    expect(ecrireHeureDeRappel(8)).toBe("8 h");
    expect(ecrireHeureDeRappel(0)).toBe("0 h");
    expect(ecrireHeureDeRappel(23)).toBe("23 h");
  });

  it("borne une valeur impossible plutôt que de l'écrire", () => {
    expect(ecrireHeureDeRappel(42)).toBe("23 h");
    expect(ecrireHeureDeRappel(-3)).toBe("0 h");
  });
});
