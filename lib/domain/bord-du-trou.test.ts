import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { sansLesBordsDuTrou, termeDebordeSurLaPhrase, trouSansRedite } from "./bord-du-trou";
import { reponseAcceptee } from "./reponse-cloze";

const PHRASE = "Le classement ATP glisse sur une fenêtre de ___ semaines.";

describe("sansLesBordsDuTrou", () => {
  it("rend à la phrase le mot qu'elle pose après le trou", () => {
    expect(sansLesBordsDuTrou(PHRASE, "52 semaines")).toBe("52");
  });

  it("rend aussi celui qu'elle pose avant", () => {
    expect(
      sansLesBordsDuTrou("La compression ___ écrase l'image.", "compression anamorphique"),
    ).toBe("anamorphique");
  });

  it("rogne des deux côtés et sur plusieurs mots", () => {
    expect(sansLesBordsDuTrou("Un effet ___ de bord apparaît.", "effet indésirable de bord")).toBe(
      "indésirable",
    );
  });

  it("ignore la casse, les accents et la ponctuation des bords", () => {
    expect(sansLesBordsDuTrou("Elle glisse sur ___ Semaines !", "52 semaines")).toBe("52");
  });

  it("laisse intact un terme qui ne redit rien", () => {
    expect(sansLesBordsDuTrou(PHRASE, "52")).toBe("52");
    expect(sansLesBordsDuTrou(PHRASE, "cinquante-deux")).toBe("cinquante-deux");
    expect(sansLesBordsDuTrou("Le trou masque ___ ici.", "un terme")).toBe("un terme");
  });

  it("ne rogne jamais jusqu'au vide", () => {
    expect(sansLesBordsDuTrou("Il glisse sur ___ semaines.", "semaines")).toBe("semaines");
    expect(sansLesBordsDuTrou("Sur ___ semaines semaines.", "semaines semaines")).toBe("semaines");
  });

  it("laisse intact un terme quand la phrase n'a pas de trou", () => {
    expect(sansLesBordsDuTrou("Une phrase sans trou.", "52 semaines")).toBe("52 semaines");
  });

  it("garde au moins un mot, toujours", () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[a-z ]{1,20}$/),
        fc.stringMatching(/^[a-z]{1,8}( [a-z]{1,8}){0,2}$/),
        (bord, terme) => {
          const rogne = sansLesBordsDuTrou(`${bord} ___ ${bord}`, terme);

          return rogne.trim().length > 0 && terme.includes(rogne.split(" ")[0] ?? "");
        },
      ),
    );
  });
});

describe("termeDebordeSurLaPhrase", () => {
  it("dit vrai quand le terme redit un bord", () => {
    expect(termeDebordeSurLaPhrase(PHRASE, "52 semaines")).toBe(true);
  });

  it("dit faux quand il ne redit rien", () => {
    expect(termeDebordeSurLaPhrase(PHRASE, "52")).toBe(false);
  });
});

describe("trouSansRedite", () => {
  const trou = {
    sentence: PHRASE,
    accepted: ["52 semaines", "cinquante-deux semaines"],
    leurres: ["12 semaines", "104 semaines", "26 semaines"],
  };

  it("met la forme rognée en tête et garde la longue", () => {
    const servi = trouSansRedite(trou);

    expect(servi.accepted[0]).toBe("52");
    expect(servi.accepted).toContain("52 semaines");
    expect(servi.accepted).toContain("cinquante-deux semaines");
  });

  it("accepte la réponse courte comme la longue", () => {
    const servi = trouSansRedite(trou);

    expect(reponseAcceptee("52", servi.accepted)).toBe(true);
    expect(reponseAcceptee("52 semaines", servi.accepted)).toBe(true);
  });

  it("rogne les leurres du même geste", () => {
    expect(trouSansRedite(trou).leurres).toEqual(["12", "104", "26"]);
  });

  it("ne touche à rien quand le terme ne déborde pas", () => {
    const propre = { sentence: PHRASE, accepted: ["52"], leurres: ["12 semaines"] };

    expect(trouSansRedite(propre)).toEqual(propre);
  });

  it("ne touche à rien sans forme acceptée", () => {
    const vide = { sentence: PHRASE, accepted: [], leurres: [] };

    expect(trouSansRedite(vide)).toEqual(vide);
  });
});
