import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { composerLePartage } from "./texte-partage";

const ADRESSE = "https://chatgpt.com/share/abc123";

describe("composerLePartage", () => {
  it("rend la sélection telle quelle", () => {
    expect(composerLePartage({ texte: "Le système glymphatique évacue les déchets." })).toEqual({
      texte: "Le système glymphatique évacue les déchets.",
      lienSeul: false,
    });
  });

  it("range l'adresse après la prose, sur sa propre ligne", () => {
    expect(composerLePartage({ texte: "Une sélection", lien: ADRESSE })).toEqual({
      texte: `Une sélection\n\n${ADRESSE}`,
      lienSeul: false,
    });
  });

  it("ne répète pas une adresse déjà présente dans la sélection", () => {
    const texte = `Regarde ça : ${ADRESSE}`;

    expect(composerLePartage({ texte, lien: ADRESSE })).toEqual({ texte, lienSeul: false });
  });

  it("reconnaît l'adresse même quand le navigateur l'a rangée dans le texte", () => {
    // Le partage d'une conversation entière : l'application n'envoie que son
    // adresse publique, et Chrome ne la déplace pas toujours dans `url`.
    expect(composerLePartage({ texte: ADRESSE })).toEqual({ texte: ADRESSE, lienSeul: true });
  });

  it("signale l'adresse seule même quand un titre l'accompagne", () => {
    // Le cas réel : « ChatGPT — Sommeil et mémoire » en sujet, l'adresse en texte.
    expect(composerLePartage({ titre: "ChatGPT — Sommeil et mémoire", lien: ADRESSE })).toEqual({
      texte: `ChatGPT — Sommeil et mémoire\n\n${ADRESSE}`,
      lienSeul: true,
    });
  });

  it("se rabat sur le titre quand il n'y a rien d'autre", () => {
    expect(composerLePartage({ titre: "Une note" })).toEqual({
      texte: "Une note",
      lienSeul: false,
    });
  });

  it("préfère la prose au titre", () => {
    expect(composerLePartage({ titre: "Un titre", texte: "Une phrase" })).toEqual({
      texte: "Une phrase",
      lienSeul: false,
    });
  });

  it("rend un champ vide quand le partage ne portait rien", () => {
    expect(composerLePartage({})).toEqual({ texte: "", lienSeul: false });
    expect(composerLePartage({ titre: "  ", texte: "\n", lien: "" })).toEqual({
      texte: "",
      lienSeul: false,
    });
  });

  it("ne laisse jamais de blanc en tête ni en fin", () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), fc.string(), (titre, texte, lien) => {
        expect(composerLePartage({ titre, texte, lien }).texte).toBe(
          composerLePartage({ titre, texte, lien }).texte.trim(),
        );
      }),
    );
  });

  it("ne perd jamais la sélection partagée", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), fc.string(), (texte, lien) => {
        const propre = texte.trim();

        fc.pre(propre.length > 0 && !/^https?:\/\/\S+$/i.test(propre));

        expect(composerLePartage({ texte, lien }).texte).toContain(propre);
      }),
    );
  });

  it("ne dit « lien seul » que s'il y a bien une adresse dans le résultat", () => {
    // Les adresses sont tirées explicitement : sur des chaînes quelconques, le
    // cas ne se présenterait jamais et la propriété passerait à vide.
    fc.assert(
      fc.property(
        fc.string(),
        fc.oneof(fc.constant(""), fc.webUrl(), fc.string()),
        fc.oneof(fc.constant(""), fc.webUrl()),
        (titre, texte, lien) => {
          const compose = composerLePartage({ titre, texte, lien });

          if (compose.lienSeul) expect(compose.texte).toMatch(/https?:\/\//i);
        },
      ),
    );
  });
});
