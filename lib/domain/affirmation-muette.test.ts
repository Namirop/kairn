import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { sansAffirmationMuette } from "./affirmation-muette";

const FORMATS = ["MCQ", "CLOZE", "TRUE_FALSE", "SHORT_ANSWER", "CODE", "EXPLAIN"] as const;

function question(format: string, estVraie?: boolean | null) {
  return { format, estVraie };
}

describe("sansAffirmationMuette", () => {
  it("garde une affirmation qui dit son verdict", () => {
    expect(sansAffirmationMuette([question("TRUE_FALSE", true)])).toHaveLength(1);
    expect(sansAffirmationMuette([question("TRUE_FALSE", false)])).toHaveLength(1);
  });

  it("écarte une affirmation sans verdict", () => {
    expect(sansAffirmationMuette([question("TRUE_FALSE", null)])).toEqual([]);
    expect(sansAffirmationMuette([question("TRUE_FALSE")])).toEqual([]);
  });

  it("laisse les autres formats intacts, verdict ou pas", () => {
    const lot = [question("MCQ"), question("CLOZE", null), question("EXPLAIN", true)];

    expect(sansAffirmationMuette(lot)).toEqual(lot);
  });

  it("garde l'ordre du lot et n'en retire que ce qu'il doit", () => {
    const lot = [question("MCQ"), question("TRUE_FALSE"), question("EXPLAIN")];

    expect(sansAffirmationMuette(lot).map((q) => q.format)).toEqual(["MCQ", "EXPLAIN"]);
  });

  it("ne retient une question que si elle est servable", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            format: fc.constantFrom(...FORMATS),
            estVraie: fc.option(fc.boolean(), { nil: null }),
          }),
        ),
        (lot) => {
          const gardees = sansAffirmationMuette(lot);

          return gardees.every((q) => q.format !== "TRUE_FALSE" || typeof q.estVraie === "boolean");
        },
      ),
    );
  });
});
