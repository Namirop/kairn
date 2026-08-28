import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { noteApresAide, pistesDuTrou, type NoteDeTrou } from "./aide-du-trou";

const LEURRES = ["convection", "conduction", "rayonnement"];
const NOTES: readonly NoteDeTrou[] = ["AGAIN", "HARD", "GOOD", "EASY"];

describe("pistesDuTrou", () => {
  it("propose le terme attendu au milieu de ses leurres", () => {
    const pistes = pistesDuTrou("dilatation", LEURRES, "variante-1");

    expect(pistes).toHaveLength(4);
    expect(pistes).toContain("dilatation");
    expect([...pistes].sort()).toEqual([...LEURRES, "dilatation"].sort());
  });

  it("ne propose rien quand il n'y a pas de quoi réduire le champ", () => {
    expect(pistesDuTrou("dilatation", [], "v")).toEqual([]);
    expect(pistesDuTrou("dilatation", ["convection"], "v")).toEqual([]);
  });

  it("propose dès trois termes", () => {
    expect(pistesDuTrou("dilatation", ["convection", "conduction"], "v")).toHaveLength(3);
  });

  /** Un leurre qui redit la réponse donnerait deux bonnes réponses dans la liste. */
  it("retire le leurre qui répète le terme attendu, aux accents près", () => {
    expect(pistesDuTrou("Dilatation", ["dilatation", "convection", "conduction"], "v")).toEqual(
      expect.arrayContaining(["Dilatation", "convection", "conduction"]),
    );
    expect(
      pistesDuTrou("Dilatation", ["dilatation", "convection", "conduction"], "v"),
    ).toHaveLength(3);
  });

  it("s'arrête à quatre pistes", () => {
    expect(pistesDuTrou("a1", ["b2", "c3", "d4", "e5", "f6"], "v")).toHaveLength(4);
  });

  it("rend le même ordre pour la même graine, un autre pour une autre", () => {
    expect(pistesDuTrou("dilatation", LEURRES, "v1")).toEqual(
      pistesDuTrou("dilatation", LEURRES, "v1"),
    );

    const ordres = new Set(
      Array.from({ length: 40 }, (_, rang) =>
        pistesDuTrou("dilatation", LEURRES, `v${rang}`).join("|"),
      ),
    );

    // Le terme attendu ne doit pas se retrouver toujours au même rang.
    expect(ordres.size).toBeGreaterThan(1);
  });

  it("ne rend jamais rien qu'on ne lui ait donné", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.array(fc.string({ minLength: 1 }), { maxLength: 6 }),
        fc.string({ minLength: 1 }),
        (attendu, leurres, graine) => {
          const pistes = pistesDuTrou(attendu, leurres, graine);
          const donnes = [attendu, ...leurres].map((t) => t.trim());

          return (
            pistes.length <= 4 &&
            (pistes.length === 0 || pistes.length >= 3) &&
            pistes.every((piste) => donnes.includes(piste)) &&
            new Set(pistes).size === pistes.length
          );
        },
      ),
      { numRuns: 400 },
    );
  });

  it("garde le terme attendu dès qu'elle propose quelque chose", () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1 }), { minLength: 2, maxLength: 6 }),
        (leurres) => {
          const pistes = pistesDuTrou("terme-attendu", leurres, "v");

          return pistes.length === 0 || pistes.includes("terme-attendu");
        },
      ),
      { numRuns: 300 },
    );
  });
});

describe("noteApresAide", () => {
  it("ne touche à rien sans coup de pouce", () => {
    for (const note of NOTES) {
      expect(noteApresAide(note, false)).toBe(note);
    }
  });

  it("descend d'un cran quand l'aide a été demandée", () => {
    expect(noteApresAide("EASY", true)).toBe("GOOD");
    expect(noteApresAide("GOOD", true)).toBe("HARD");
    expect(noteApresAide("HARD", true)).toBe("AGAIN");
  });

  it("ne descend pas plus bas que le bas", () => {
    expect(noteApresAide("AGAIN", true)).toBe("AGAIN");
  });

  /** Une aide ne rend jamais un passage meilleur : c'est tout l'objet du prix. */
  it("ne remonte jamais une note", () => {
    const rang: Record<NoteDeTrou, number> = { AGAIN: 0, HARD: 1, GOOD: 2, EASY: 3 };

    fc.assert(
      fc.property(
        fc.constantFrom(...NOTES),
        fc.boolean(),
        (note, aide) => rang[noteApresAide(note, aide)] <= rang[note],
      ),
      { numRuns: 200 },
    );
  });
});
