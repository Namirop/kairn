import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { lignesRecollees } from "./lignes-recollees";

/** Le paragraphe de production qui a fait ouvrir ce module, à ses longueurs exactes. */
const ENROULE = [
  'En espagnol, ser et estar traduisent tous les deux "être" mais ne',
  "s'emploient pas dans les mêmes cas. Ser sert pour ce qui est",
  "permanent ou définitoire : l'identité, l'origine, la profession, les",
  "caractéristiques stables. Soy francés, es médico, la mesa es de",
  "madera. Estar sert pour ce qui est temporaire ou situationnel :",
].join("\r\n");

/** Une liste d'entrées, une par ligne, telle qu'elle a été déposée. */
const LISTE = [
  "to look forward to — attendre avec impatience",
  "to come across — tomber sur, rencontrer par hasard",
  "to get away with — s'en tirer sans conséquence",
  "to put up with — supporter, tolérer",
].join("\n");

describe("lignesRecollees", () => {
  it("recolle un paragraphe enroulé à une colonne", () => {
    expect(lignesRecollees(ENROULE)).not.toContain("\n");
    expect(lignesRecollees(ENROULE)).toContain("mais ne s'emploient pas");
  });

  it("garde les retours d'une liste d'entrées courtes", () => {
    expect(lignesRecollees(LISTE)).toBe(LISTE);
  });

  it("garde la ligne vide qui sépare deux paragraphes", () => {
    const rendu = lignesRecollees(`${ENROULE}\r\n\r\n${ENROULE}`);

    expect(rendu.split("\n\n")).toHaveLength(2);
  });

  it("ne recolle jamais une ligne qui ouvre une entrée", () => {
    const puces = [
      "- Crash pendant l'étape 1 : seul le fichier temporaire est abîmé, l'autre est intact.",
      "- L'étape 2 est instantanée : il n'y a pas de moitié de renommage.",
    ].join("\n");

    expect(lignesRecollees(puces)).toBe(puces);
  });

  it("ne recolle pas derrière une ligne courte, même dans un paragraphe long", () => {
    const texte = [
      "Cette première ligne est assez longue pour dépasser le seuil d'enroulement retenu.",
      "Courte.",
      "Et celle-ci repart sur une longueur ordinaire, sans avoir à être recollée derrière.",
    ].join("\n");

    expect(lignesRecollees(texte).split("\n")).toHaveLength(2);
  });

  it("laisse un texte d'une seule ligne intact", () => {
    expect(lignesRecollees("Une phrase seule.")).toBe("Une phrase seule.");
    expect(lignesRecollees("")).toBe("");
  });

  it("normalise les fins de ligne de Windows", () => {
    expect(lignesRecollees("Un\r\nDeux")).toBe("Un\nDeux");
    expect(lignesRecollees("Un\rDeux")).toBe("Un\nDeux");
  });

  it("ne perd et n'invente aucun mot", () => {
    fc.assert(
      fc.property(fc.array(fc.stringMatching(/^[a-zé ]{0,90}$/), { maxLength: 30 }), (lignes) => {
        const texte = lignes.join("\n");
        const mots = (entree: string) => entree.split(/\s+/).filter(Boolean);

        expect(mots(lignesRecollees(texte))).toEqual(mots(texte));
      }),
    );
  });

  it("ne rend jamais plus de lignes qu'il n'en a reçu", () => {
    fc.assert(
      fc.property(fc.array(fc.stringMatching(/^[a-z .-]{0,90}$/), { maxLength: 30 }), (lignes) => {
        const texte = lignes.join("\n");

        expect(lignesRecollees(texte).split("\n").length).toBeLessThanOrEqual(lignes.length || 1);
      }),
    );
  });
});
