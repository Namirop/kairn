import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { ecrireHeureDeRappel, lireHeureDeRappel } from "./heure-de-rappel";
import type { LangueDuProduit } from "./langue-du-produit";

const LANGUES: LangueDuProduit[] = ["FR", "EN"];

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

  it("lit l'heure sur douze heures, comme on l'écrit en anglais", () => {
    expect(lireHeureDeRappel("7 pm")).toBe(19);
    expect(lireHeureDeRappel("7pm")).toBe(19);
    expect(lireHeureDeRappel("7 PM")).toBe(19);
    expect(lireHeureDeRappel("7 p.m.")).toBe(19);
    expect(lireHeureDeRappel("7:00 pm")).toBe(19);
    expect(lireHeureDeRappel("8 am")).toBe(8);
    expect(lireHeureDeRappel("8 a.m.")).toBe(8);
    expect(lireHeureDeRappel("11 pm")).toBe(23);
  });

  it("place midi et minuit là où ils sont, sans décalage d'une demi-journée", () => {
    expect(lireHeureDeRappel("12 pm")).toBe(12);
    expect(lireHeureDeRappel("12 am")).toBe(0);
    expect(lireHeureDeRappel("1 am")).toBe(1);
    expect(lireHeureDeRappel("12")).toBe(12);
  });

  it("refuse une heure sur douze qui n'existe pas", () => {
    expect(lireHeureDeRappel("0 am")).toBe(null);
    expect(lireHeureDeRappel("13 pm")).toBe(null);
    expect(lireHeureDeRappel("19 pm")).toBe(null);
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
    expect(lireHeureDeRappel("8:30 pm")).toBe(null);
  });

  it("refuse ce qui n'est pas une heure", () => {
    expect(lireHeureDeRappel("")).toBe(null);
    expect(lireHeureDeRappel("le matin")).toBe(null);
    expect(lireHeureDeRappel("8 heures et demie")).toBe(null);
    expect(lireHeureDeRappel("pm")).toBe(null);
    expect(lireHeureDeRappel("8 xm")).toBe(null);
  });

  it("relit toujours ce qu'elle vient d'écrire, dans les deux langues", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 23 }), fc.constantFrom(...LANGUES), (heure, langue) => {
        return lireHeureDeRappel(ecrireHeureDeRappel(heure, langue)) === heure;
      }),
      { numRuns: 200 },
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
  it("écrit l'heure comme on la dit en français", () => {
    expect(ecrireHeureDeRappel(8, "FR")).toBe("8 h");
    expect(ecrireHeureDeRappel(0, "FR")).toBe("0 h");
    expect(ecrireHeureDeRappel(12, "FR")).toBe("12 h");
    expect(ecrireHeureDeRappel(19, "FR")).toBe("19 h");
    expect(ecrireHeureDeRappel(23, "FR")).toBe("23 h");
  });

  it("écrit l'heure comme on la dit en anglais, midi et minuit compris", () => {
    expect(ecrireHeureDeRappel(0, "EN")).toBe("12 am");
    expect(ecrireHeureDeRappel(1, "EN")).toBe("1 am");
    expect(ecrireHeureDeRappel(8, "EN")).toBe("8 am");
    expect(ecrireHeureDeRappel(11, "EN")).toBe("11 am");
    expect(ecrireHeureDeRappel(12, "EN")).toBe("12 pm");
    expect(ecrireHeureDeRappel(19, "EN")).toBe("7 pm");
    expect(ecrireHeureDeRappel(23, "EN")).toBe("11 pm");
  });

  it("borne une valeur impossible plutôt que de l'écrire", () => {
    expect(ecrireHeureDeRappel(42, "FR")).toBe("23 h");
    expect(ecrireHeureDeRappel(-3, "FR")).toBe("0 h");
    expect(ecrireHeureDeRappel(42, "EN")).toBe("11 pm");
    expect(ecrireHeureDeRappel(-3, "EN")).toBe("12 am");
  });

  it("écrit vingt-quatre heures distinctes dans chaque langue", () => {
    for (const langue of LANGUES) {
      const ecrites = new Set(
        Array.from({ length: 24 }, (_, heure) => ecrireHeureDeRappel(heure, langue)),
      );

      expect(ecrites.size).toBe(24);
    }
  });
});
