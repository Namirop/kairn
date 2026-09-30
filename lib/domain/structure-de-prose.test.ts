import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { elementsDeProse, type ElementDeProse } from "./structure-de-prose";

describe("elementsDeProse", () => {
  it("rend un texte ordinaire en un paragraphe", () => {
    expect(elementsDeProse("Le vinaigre dissout le calcaire.")).toEqual([
      { type: "paragraphe", texte: "Le vinaigre dissout le calcaire." },
    ]);
  });

  it("lit les trois niveaux de titre, et ramène les suivants au troisième", () => {
    expect(elementsDeProse("# Un\n## Deux\n### Trois\n#### Quatre")).toEqual([
      { type: "titre", niveau: 1, texte: "Un" },
      { type: "titre", niveau: 2, texte: "Deux" },
      { type: "titre", niveau: 3, texte: "Trois" },
      { type: "titre", niveau: 3, texte: "Quatre" },
    ]);
  });

  /** Un dièse sans espace n'est pas un titre : c'est une étiquette, un numéro. */
  it("ne prend pas un dièse collé pour un titre", () => {
    expect(elementsDeProse("#Android est une plateforme")).toEqual([
      { type: "paragraphe", texte: "#Android est une plateforme" },
    ]);
  });

  it("regroupe les puces en une liste, quelle que soit la marque", () => {
    expect(elementsDeProse("- une\n* deux\n• trois")).toEqual([
      { type: "liste", ordonnee: false, entrees: ["une", "deux", "trois"] },
    ]);
  });

  it("distingue une liste numérotée d'une liste à puces", () => {
    expect(elementsDeProse("1. une\n2) deux")).toEqual([
      { type: "liste", ordonnee: true, depart: 1, entrees: ["une", "deux"] },
    ]);
  });

  /** Un dépôt coupé au milieu d'une énumération reprend là où il reprend. */
  it("garde le numéro par lequel une liste commence", () => {
    expect(elementsDeProse("4. quatre\n5. cinq")).toEqual([
      { type: "liste", ordonnee: true, depart: 4, entrees: ["quatre", "cinq"] },
    ]);
  });

  it("ferme une liste dès que la nature des lignes change", () => {
    expect(elementsDeProse("- une\nUne phrase.")).toEqual([
      { type: "liste", ordonnee: false, entrees: ["une"] },
      { type: "paragraphe", texte: "Une phrase." },
    ]);
  });

  /** Le tableau du dépôt de production, ramené à deux colonnes. */
  it("lit un tableau, en-tête compris", () => {
    const texte = "| fichier | rôle |\n|---|---|\n| settings.gradle.kts | plan du projet |";

    expect(elementsDeProse(texte)).toEqual([
      {
        type: "tableau",
        entetes: ["fichier", "rôle"],
        lignes: [["settings.gradle.kts", "plan du projet"]],
      },
    ]);
  });

  it("ne donne pas d'en-tête à un tableau sans ligne séparatrice", () => {
    expect(elementsDeProse("| a | b |\n| c | d |")).toEqual([
      {
        type: "tableau",
        entetes: [],
        lignes: [
          ["a", "b"],
          ["c", "d"],
        ],
      },
    ]);
  });

  it("complète les rangées courtes pour que la grille reste carrée", () => {
    const lu = elementsDeProse("| a | b | c |\n|---|---|---|\n| d |");

    expect(lu).toEqual([{ type: "tableau", entetes: ["a", "b", "c"], lignes: [["d", "", ""]] }]);
  });

  it("garde les retours voulus d'un paragraphe et écarte les lignes vides", () => {
    expect(elementsDeProse("une\ndeux\n\n\ntrois")).toEqual([
      { type: "paragraphe", texte: "une\ndeux" },
      { type: "paragraphe", texte: "trois" },
    ]);
  });

  it("ne rend rien d'un texte vide ou blanc", () => {
    expect(elementsDeProse("")).toEqual([]);
    expect(elementsDeProse("  \n\n \t ")).toEqual([]);
  });

  /** Des barres sans cellule ne font pas un tableau, et repartent en prose. */
  it("ne fabrique pas un tableau vide", () => {
    expect(elementsDeProse("|")).toEqual([{ type: "paragraphe", texte: "|" }]);
    expect(elementsDeProse("| a |\n|---|")).toEqual([
      { type: "paragraphe", texte: "| a |\n|---|" },
    ]);
  });

  /**
   * Les chiffres sont hors du tirage : celui d'une liste numérotée est une
   * marque, pas du contenu, et le rendu le réécrit à partir de `depart`.
   */
  it("ne perd aucune lettre en chemin", () => {
    const lisible = (texte: string) => texte.replace(/[^a-z]/g, "");
    const contenuDe = (element: ElementDeProse): string => {
      if (element.type === "liste") return element.entrees.join("");
      if (element.type === "tableau")
        return [...element.entetes, ...element.lignes.flat()].join("");

      return element.texte;
    };

    fc.assert(
      fc.property(
        fc.array(fc.stringMatching(/^[a-z #|*.\-]{0,24}$/), { maxLength: 12 }),
        (lignes) => {
          const rendu = elementsDeProse(lignes.join("\n")).map(contenuDe).join("");

          // Les marques disparaissent, ce qu'elles marquaient reste, et dans
          // l'ordre : c'est la seule garantie qui compte sur un dépôt.
          expect(lisible(rendu)).toBe(lisible(lignes.join("\n")));
        },
      ),
      { numRuns: 300 },
    );
  });
});
