import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { repartirLesFormats, type VarianteRepartissable } from "./repartition-des-formats";

/** Le lot type d'un concept neuf : quatre facettes, quatre formats. */
function lot(rang: number): VarianteRepartissable[] {
  return [
    { id: `${rang}-a`, facet: "RECOGNITION", format: "CLOZE" },
    { id: `${rang}-b`, facet: "MECHANISM", format: "EXPLAIN" },
    { id: `${rang}-c`, facet: "BOUNDARY", format: "TRUE_FALSE" },
    { id: `${rang}-d`, facet: "APPLICATION", format: "MCQ" },
  ];
}

function formats(retenues: (VarianteRepartissable | undefined)[]): string[] {
  return retenues.map((variante) => variante?.format ?? "—");
}

describe("repartirLesFormats", () => {
  /**
   * Le défaut rapporté : douze concepts neufs, et la session servait douze fois
   * le même format parce que l'identifiant décidait partout de la même façon.
   */
  it("ne sert pas douze fois le même format quand tous les concepts sont neufs", () => {
    const retenues = repartirLesFormats(Array.from({ length: 12 }, (_, rang) => lot(rang)));
    const comptes = new Map<string, number>();

    for (const format of formats(retenues)) {
      comptes.set(format, (comptes.get(format) ?? 0) + 1);
    }

    expect([...comptes.keys()].sort()).toEqual(["CLOZE", "EXPLAIN", "MCQ", "TRUE_FALSE"]);
    // Douze concepts, quatre formats dont un qui compte double : aucun ne prend
    // la moitié de la session, et aucun ne disparaît.
    expect(Math.max(...comptes.values())).toBeLessThanOrEqual(4);
    expect(Math.min(...comptes.values())).toBeGreaterThanOrEqual(2);
  });

  /**
   * Le défaut mesuré le 30/09 : l'explication faisait 14,7 % des questions
   * écrites et 22,8 % des questions servies. Égaliser les formats la promouvait
   * au quart de la session, et trois questions à s'auto-noter sur douze se
   * sentent — on les expédie sans les lire.
   */
  it("ne promeut plus la question qu'on se note soi-même au quart de la session", () => {
    const retenues = repartirLesFormats(Array.from({ length: 20 }, (_, rang) => lot(rang)));
    const libres = formats(retenues).filter((format) => format === "EXPLAIN").length;

    expect(libres).toBeLessThanOrEqual(4);
    expect(libres).toBeGreaterThanOrEqual(2);
  });

  it("fait tourner les quatre formats dans l'ordre du moins servi", () => {
    const retenues = repartirLesFormats([lot(0), lot(1), lot(2), lot(3), lot(4)]);

    expect(formats(retenues)).toEqual(["CLOZE", "EXPLAIN", "TRUE_FALSE", "MCQ", "CLOZE"]);
  });

  it("n'invente rien quand la rotation n'a laissé qu'un choix", () => {
    const force = [{ id: "seul", facet: "MECHANISM", format: "EXPLAIN" }];
    const retenues = repartirLesFormats([force, force, force]);

    expect(formats(retenues)).toEqual(["EXPLAIN", "EXPLAIN", "EXPLAIN"]);
  });

  it("garde la place d'un concept sans variante servable", () => {
    const retenues = repartirLesFormats([lot(0), [], lot(2)]);

    expect(retenues[1]).toBeUndefined();
    expect(retenues).toHaveLength(3);
  });

  it("départage par la facette la moins servie quand les formats sont à égalité", () => {
    const memeFormat = (rang: number): VarianteRepartissable[] => [
      { id: `${rang}-a`, facet: "RECOGNITION", format: "MCQ" },
      { id: `${rang}-b`, facet: "BOUNDARY", format: "MCQ" },
    ];
    const retenues = repartirLesFormats([memeFormat(0), memeFormat(1), memeFormat(2)]);

    expect(retenues.map((v) => v?.facet)).toEqual(["RECOGNITION", "BOUNDARY", "RECOGNITION"]);
  });

  it("rend une variante par concept, et toujours l'une des siennes", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.array(
            fc.record({
              id: fc.string({ minLength: 1 }),
              format: fc.constantFrom("MCQ", "CLOZE", "TRUE_FALSE", "EXPLAIN", "CODE"),
              facet: fc.constantFrom("RECOGNITION", "MECHANISM", "BOUNDARY", "APPLICATION"),
            }),
            { maxLength: 4 },
          ),
          { maxLength: 20 },
        ),
        (choix) => {
          const retenues = repartirLesFormats(choix);

          return (
            retenues.length === choix.length &&
            retenues.every((retenue, rang) =>
              retenue === undefined
                ? choix[rang]?.length === 0
                : (choix[rang] ?? []).includes(retenue),
            )
          );
        },
      ),
      { numRuns: 300 },
    );
  });

  it("rend deux fois la même répartition pour la même entrée", () => {
    const entree = [lot(0), lot(1), lot(2)];

    expect(formats(repartirLesFormats(entree))).toEqual(formats(repartirLesFormats(entree)));
  });
});
