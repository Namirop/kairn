import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { blocsDeTexte, porteDuCodeEnBloc } from "./blocs-de-texte";

/** Le dépôt de production qui a fait ouvrir ce module, réduit à sa structure. */
const DEPOT = [
  "La parade : écrire à côté, puis renommer.",
  "",
  "```js",
  'writeFileSync("detail.json.tmp", contenu);   // 1. écrire à côté',
  '  renameSync("detail.json.tmp", "detail.json");',
  "```",
  "",
  "- Crash pendant l'étape 1 : seul le `.tmp` est abîmé.",
].join("\n");

describe("blocsDeTexte", () => {
  it("rend un texte sans barrière en un seul bloc de prose", () => {
    expect(blocsDeTexte("Une phrase ordinaire.")).toEqual([
      { type: "prose", texte: "Une phrase ordinaire." },
    ]);
  });

  it("sépare la prose du code et retient le langage", () => {
    const blocs = blocsDeTexte(DEPOT);

    expect(blocs.map((bloc) => bloc.type)).toEqual(["prose", "code", "prose"]);
    expect(blocs[1]).toMatchObject({ type: "code", langage: "js" });
  });

  it("recopie le code tel quel, indentation comprise", () => {
    const bloc = blocsDeTexte(DEPOT)[1];

    expect(bloc?.texte).toContain('  renameSync("detail.json.tmp"');
    expect(bloc?.texte.split("\n")).toHaveLength(2);
  });

  it("ne relève aucun langage quand la barrière n'en donne pas", () => {
    expect(blocsDeTexte("```\nls -la\n```")[0]).toEqual({
      type: "code",
      langage: null,
      texte: "ls -la",
    });
  });

  it("ferme au bout du texte une barrière restée ouverte", () => {
    const blocs = blocsDeTexte("Voici :\n\n```py\nprint(1)\nprint(2)");

    expect(blocs.map((bloc) => bloc.type)).toEqual(["prose", "code"]);
    expect(blocs[1]?.texte).toBe("print(1)\nprint(2)");
  });

  it("laisse les accents graves en ligne à qui sait les lire", () => {
    const blocs = blocsDeTexte("On appelle `useState` ici.");

    expect(blocs).toEqual([{ type: "prose", texte: "On appelle `useState` ici." }]);
  });

  it("recolle la prose et jamais le code", () => {
    const enroule = [
      "En espagnol, ser et estar traduisent tous les deux « être » mais ne",
      "s'emploient pas dans les mêmes cas, et c'est ce qui fait trébucher.",
    ].join("\n");
    const blocs = blocsDeTexte(`${enroule}\n\n\`\`\`\nun\ndeux\n\`\`\``);

    expect(blocs[0]?.texte).not.toContain("\n");
    expect(blocs[1]?.texte).toBe("un\ndeux");
  });

  it("n'écrit aucun bloc vide", () => {
    expect(blocsDeTexte("")).toEqual([]);
    expect(blocsDeTexte("\n\n```\n\n```\n\n")).toEqual([]);
  });

  it("ne rend jamais un bloc vide, quel que soit le texte", () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 400 }), (texte) => {
        expect(blocsDeTexte(texte).every((bloc) => bloc.texte.length > 0)).toBe(true);
      }),
    );
  });

  it("ne garde aucune barrière dans ce qu'il rend", () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom("```", "```ts", "du texte", "", "  indenté"), { maxLength: 20 }),
        (lignes) => {
          expect(blocsDeTexte(lignes.join("\n")).every((bloc) => !bloc.texte.includes("```"))).toBe(
            true,
          );
        },
      ),
    );
  });
});

describe("porteDuCodeEnBloc", () => {
  it("distingue un extrait en bloc d'un terme en ligne", () => {
    expect(porteDuCodeEnBloc(DEPOT)).toBe(true);
    expect(porteDuCodeEnBloc("On appelle `useState`.")).toBe(false);
  });
});
