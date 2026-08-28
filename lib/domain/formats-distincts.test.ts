import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { unParFormat } from "./formats-distincts";

const q = (format: string, question = format) => ({ format, question });

describe("unParFormat", () => {
  it("laisse passer une liste déjà distincte", () => {
    const posees = [q("MCQ"), q("CLOZE"), q("TRUE_FALSE"), q("EXPLAIN")];

    expect(unParFormat(posees)).toEqual(posees);
  });

  it("garde la première des deux questions d'un même format", () => {
    const premiere = q("CLOZE", "la première phrase à trou");
    const seconde = q("CLOZE", "la seconde phrase à trou");

    expect(unParFormat([q("MCQ"), premiere, seconde, q("TRUE_FALSE")])).toEqual([
      q("MCQ"),
      premiere,
      q("TRUE_FALSE"),
    ]);
  });

  it("rend une liste vide sur une liste vide", () => {
    expect(unParFormat([])).toEqual([]);
  });

  it("ne rend jamais deux fois le même format", () => {
    fc.assert(
      fc.property(fc.array(fc.constantFrom("MCQ", "CLOZE", "TRUE_FALSE", "CODE")), (formats) => {
        const gardes = unParFormat(formats.map((format) => q(format)));

        expect(new Set(gardes.map((garde) => garde.format)).size).toBe(gardes.length);
      }),
    );
  });

  it("garde l'ordre d'origine et ne rend que des questions reçues", () => {
    fc.assert(
      fc.property(fc.array(fc.constantFrom("MCQ", "CLOZE", "TRUE_FALSE", "CODE")), (formats) => {
        const posees = formats.map((format, rang) => q(format, `${format}-${rang}`));
        const gardes = unParFormat(posees);

        expect(gardes).toEqual(posees.filter((posee) => gardes.includes(posee)));
      }),
    );
  });

  it("garde exactement un représentant de chaque format présent", () => {
    fc.assert(
      fc.property(fc.array(fc.constantFrom("MCQ", "CLOZE", "TRUE_FALSE", "CODE")), (formats) => {
        expect(unParFormat(formats.map((format) => q(format)))).toHaveLength(new Set(formats).size);
      }),
    );
  });
});
