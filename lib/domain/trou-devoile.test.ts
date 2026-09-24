import { describe, expect, it } from "vitest";
import { phraseSansDevoilement, trouDevoileSaReponse } from "./trou-devoile";

describe("trouDevoileSaReponse", () => {
  it("relève le terme recopié plus loin dans la phrase", () => {
    // Servi en production le 09/09/2026, sur un dépôt de grammaire espagnole.
    const phrase =
      "Dans « es ___ », la phrase signifie qu'il est ennuyeux, tandis que « está aburrido » signifie qu'il s'ennuie.";

    expect(trouDevoileSaReponse(phrase, "aburrido")).toBe(true);
  });

  it("laisse tranquille une phrase qui ne porte le terme nulle part", () => {
    expect(
      trouDevoileSaReponse("Le verbe « estar » exprime un état ___ ou situationnel.", "temporaire"),
    ).toBe(false);
  });

  it("ne compte pas le trou lui-même comme une occurrence", () => {
    expect(trouDevoileSaReponse("___ accélère la balle.", "Le gazon")).toBe(false);
  });

  it("ignore les accents, la casse et la ponctuation, comme la notation", () => {
    expect(
      trouDevoileSaReponse("La ___ dure, car l'Extraction ! reste courte.", "extraction"),
    ).toBe(true);
  });

  it("rapproche le trait d'union de l'espace, comme la notation", () => {
    expect(trouDevoileSaReponse("Un ___ tient si le porte greffe est sain.", "porte-greffe")).toBe(
      true,
    );
  });

  it("ne se déclenche pas quand un seul mot du terme se répète", () => {
    // « sommeil » revient, « paradoxal » porte la réponse : rien n'est donné.
    const phrase = "Le ___ occupe une part croissante des derniers cycles de sommeil.";

    expect(trouDevoileSaReponse(phrase, "sommeil paradoxal")).toBe(false);
  });

  it("relève un terme de plusieurs mots repris en entier et dans l'ordre", () => {
    const phrase = "Le ___ domine les deux premiers cycles, et le sommeil lent profond décroît.";

    expect(trouDevoileSaReponse(phrase, "sommeil lent profond")).toBe(true);
  });

  it("ne relève pas les mêmes mots pris dans le désordre", () => {
    expect(trouDevoileSaReponse("Le ___ suit le profond lent sommeil.", "sommeil lent")).toBe(
      false,
    );
  });

  it("ne dit rien d'une phrase sans trou : il n'y a rien à deviner", () => {
    expect(trouDevoileSaReponse("La sopa está fría.", "fría")).toBe(false);
  });

  it("ne dit rien d'un terme vide", () => {
    expect(trouDevoileSaReponse("Une phrase avec un ___ dedans.", "  ")).toBe(false);
  });

  it("ne dit rien d'un terme plus long que le reste de la phrase", () => {
    expect(trouDevoileSaReponse("___ ici.", "un terme bien plus long que la phrase")).toBe(false);
  });

  it("regarde de part et d'autre du trou", () => {
    expect(trouDevoileSaReponse("L'extraction s'arrête si la ___ est grossière.", "mouture")).toBe(
      false,
    );
    expect(
      trouDevoileSaReponse("La mouture décide, donc une ___ fine extrait plus.", "mouture"),
    ).toBe(true);
  });
});

describe("phraseSansDevoilement", () => {
  it("masque l'occurrence recopiée plus loin dans la phrase", () => {
    // Servie en session le 23/09/2026, sur un dépôt Android.
    const phrase =
      "___ et Java utilisent la même plateforme, mais Kotlin n'est pas le même langage que Java.";

    expect(phraseSansDevoilement(phrase, "Kotlin")).toBe(
      "___ et Java utilisent la même plateforme, mais ___ n'est pas le même langage que Java.",
    );
  });

  it("masque le terme jusque dans une expression citée", () => {
    const phrase =
      "Google recommande ___ pour Android depuis 2019 avec l'approche « Kotlin first ».";

    expect(phraseSansDevoilement(phrase, "Kotlin")).toBe(
      "Google recommande ___ pour Android depuis 2019 avec l'approche « ___ first ».",
    );
  });

  it("laisse la phrase intacte quand le terme ne s'y lit nulle part", () => {
    const phrase = "Le verbe « estar » exprime un état ___ ou situationnel.";

    expect(phraseSansDevoilement(phrase, "temporaire")).toBe(phrase);
  });

  it("rend une phrase que le contrôle ne signale plus", () => {
    const phrase = "La ___ décide, donc une mouture fine extrait plus.";
    const repare = phraseSansDevoilement(phrase, "mouture");

    expect(trouDevoileSaReponse(repare, "mouture")).toBe(false);
  });

  it("ignore les accents, la casse et la ponctuation, comme la notation", () => {
    expect(
      phraseSansDevoilement("La ___ dure, car l'Extraction ! reste courte.", "extraction"),
    ).toBe("La ___ dure, car l'___ ! reste courte.");
  });

  it("masque toutes les occurrences, pas seulement la première", () => {
    const phrase = "Le ___ tient : le lichen pousse, le lichen s'accroche.";

    expect(phraseSansDevoilement(phrase, "lichen")).toBe(
      "Le ___ tient : le ___ pousse, le ___ s'accroche.",
    );
  });

  it("masque un terme de plusieurs mots d'un seul tenant", () => {
    const phrase = "Le ___ domine les deux premiers cycles, et le sommeil lent profond décroît.";

    expect(phraseSansDevoilement(phrase, "sommeil lent profond")).toBe(
      "Le ___ domine les deux premiers cycles, et le ___ décroît.",
    );
  });

  it("ne touche pas à un seul mot du terme pris isolément", () => {
    const phrase = "Le ___ occupe une part croissante des derniers cycles de sommeil.";

    expect(phraseSansDevoilement(phrase, "sommeil paradoxal")).toBe(phrase);
  });

  it("ne touche pas au trou lui-même", () => {
    expect(phraseSansDevoilement("___ accélère la balle.", "Le gazon")).toBe(
      "___ accélère la balle.",
    );
  });

  it("laisse une phrase sans trou telle quelle", () => {
    expect(phraseSansDevoilement("La sopa está fría.", "fría")).toBe("La sopa está fría.");
  });

  it("laisse tranquille un terme vide", () => {
    expect(phraseSansDevoilement("Une phrase avec un ___ dedans.", "  ")).toBe(
      "Une phrase avec un ___ dedans.",
    );
  });

  it("renonce plutôt que de ne laisser aucun mot à lire", () => {
    const phrase = "___ Kotlin";

    expect(phraseSansDevoilement(phrase, "Kotlin")).toBe(phrase);
  });
});
