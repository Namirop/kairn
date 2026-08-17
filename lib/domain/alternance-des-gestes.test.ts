import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { alternerLesGestes } from "./alternance-des-gestes";
import { gesteDeReponse, type GesteDeReponse } from "./geste-de-reponse";

/** Une question réduite à ce qui compte ici : son format. */
const question = (id: string, format: string) => ({ id, format });
const geste = (item: { format: string }): GesteDeReponse => gesteDeReponse(item.format);
const suite = (items: { id: string }[]) => items.map((item) => item.id);

describe("alternerLesGestes", () => {
  it("laisse tel quel un ordre qui alterne déjà", () => {
    const questions = [
      question("a", "MCQ"),
      question("b", "CLOZE"),
      question("c", "EXPLAIN"),
      question("d", "MCQ"),
    ];

    expect(suite(alternerLesGestes(questions, geste))).toEqual(["a", "b", "c", "d"]);
  });

  it("avance la première question d'un autre geste", () => {
    // Trois « choisis ta réponse » puis un trou : le trou remonte en deuxième.
    const questions = [
      question("a", "MCQ"),
      question("b", "TRUE_FALSE"),
      question("c", "MCQ"),
      question("d", "CLOZE"),
    ];

    expect(suite(alternerLesGestes(questions, geste))).toEqual(["a", "d", "b", "c"]);
  });

  it("ne déplace rien de plus que nécessaire", () => {
    const questions = [
      question("a", "MCQ"),
      question("b", "MCQ"),
      question("c", "CLOZE"),
      question("d", "EXPLAIN"),
      question("e", "MCQ"),
    ];

    // « c » remonte pour couper les deux QCM ; le reste garde son rang relatif.
    expect(suite(alternerLesGestes(questions, geste))).toEqual(["a", "c", "b", "d", "e"]);
  });

  it("garde l'ordre reçu quand tout se répond du même geste", () => {
    const questions = [question("a", "MCQ"), question("b", "TRUE_FALSE"), question("c", "MCQ")];

    expect(suite(alternerLesGestes(questions, geste))).toEqual(["a", "b", "c"]);
  });

  it("ne perd rien et n'invente rien", () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom("MCQ", "CLOZE", "EXPLAIN", "TRUE_FALSE", "CODE"), {
          maxLength: 25,
        }),
        (formats) => {
          const questions = formats.map((format, rang) => question(`q${rang}`, format));
          const ordonnees = alternerLesGestes(questions, geste);

          return (
            ordonnees.length === questions.length &&
            new Set(suite(ordonnees)).size === questions.length
          );
        },
      ),
      { numRuns: 400 },
    );
  });

  it("n'enchaîne deux fois un geste que lorsqu'aucun autre ne restait", () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom("MCQ", "CLOZE", "EXPLAIN", "TRUE_FALSE"), { maxLength: 25 }),
        (formats) => {
          const questions = formats.map((format, rang) => question(`q${rang}`, format));
          const ordonnees = alternerLesGestes(questions, geste);

          return ordonnees.every((item, rang) => {
            if (rang === 0 || geste(item) !== geste(ordonnees[rang - 1] ?? item)) return true;

            // Le geste se répète : c'est que tout ce qui suivait le partageait.
            return ordonnees.slice(rang).every((reste) => geste(reste) === geste(item));
          });
        },
      ),
      { numRuns: 400 },
    );
  });
});
