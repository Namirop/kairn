import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { debutDuCommentaire } from "./commentaire-de-code";

describe("debutDuCommentaire", () => {
  it("trouve un commentaire en fin de ligne", () => {
    const ligne = 'writeFileSync("detail.json.tmp", contenu); // 1. écrire à côté';

    expect(debutDuCommentaire(ligne, "js")).toBe(ligne.indexOf("//"));
  });

  it("trouve un commentaire qui ouvre la ligne", () => {
    expect(debutDuCommentaire("  // usage", "ts")).toBe(2);
  });

  it("rend -1 quand la ligne n'en porte pas", () => {
    expect(debutDuCommentaire("const data = await retry(fn);", "ts")).toBe(-1);
    expect(debutDuCommentaire("", "ts")).toBe(-1);
  });

  it("ne coupe pas une adresse dans une chaîne", () => {
    expect(debutDuCommentaire('fetch("https://kairn.me/api");', "ts")).toBe(-1);
    expect(debutDuCommentaire("fetch('https://kairn.me');", "js")).toBe(-1);
    expect(debutDuCommentaire("fetch(`https://kairn.me`);", "js")).toBe(-1);
  });

  it("voit le commentaire qui suit une chaîne portant une adresse", () => {
    const ligne = 'fetch("https://kairn.me"); // la production';

    expect(debutDuCommentaire(ligne, "ts")).toBe(ligne.lastIndexOf("//"));
  });

  it("suit l'échappement à l'intérieur d'une chaîne", () => {
    expect(debutDuCommentaire('const a = "il a dit \\"non\\""; // fin', "ts")).toBe(30);
  });

  it("ne prend le dièse que là où il commente", () => {
    expect(debutDuCommentaire("print(1)  # un", "python")).toBe(10);
    expect(debutDuCommentaire(".titre { color: #16191A; }", "css")).toBe(-1);
    expect(debutDuCommentaire("echo ok # fait", "sh")).toBe(8);
  });

  it("s'en tient à la double barre quand le langage n'est pas dit", () => {
    expect(debutDuCommentaire("valeur # pas un commentaire ici")).toBe(-1);
    expect(debutDuCommentaire("valeur // celui-ci en est un")).toBe(7);
  });

  it("lit les deux tirets du SQL", () => {
    expect(debutDuCommentaire("SELECT 1; -- un commentaire", "sql")).toBe(10);
    expect(debutDuCommentaire("SELECT a - b;", "sql")).toBe(-1);
  });

  it("rend toujours une position dans la ligne, ou rien", () => {
    fc.assert(
      fc.property(
        fc.string({ maxLength: 120 }),
        fc.constantFrom<string | null>("ts", "python", "sql", null),
        (ligne, langage) => {
          const debut = debutDuCommentaire(ligne, langage);

          expect(debut === -1 || (debut >= 0 && debut < ligne.length)).toBe(true);
        },
      ),
    );
  });
});
