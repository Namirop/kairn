import { describe, expect, it } from "vitest";
import { citeDuCode, controlerConcept } from "./controle-concept";

describe("controlerConcept", () => {
  it("laisse passer un concept autoportant", () => {
    expect(
      controlerConcept(
        "`Array.prototype.at()` accepte un index négatif, compté depuis la fin du tableau.",
      ),
    ).toEqual([]);
  });

  it("repère un renvoi au texte d'origine", () => {
    const manquements = controlerConcept(
      "Comme vu plus haut dans l'article, l'index part de la fin.",
    );

    expect(manquements.map((m) => m.regle)).toContain("renvoi");
  });

  it("repère une ouverture qui reprend un antécédent absent", () => {
    const manquements = controlerConcept("Cette méthode accepte un index négatif.");

    expect(manquements.map((m) => m.regle)).toEqual(["antécédent"]);
  });

  it("laisse passer un « il » impersonnel", () => {
    expect(controlerConcept("Il faut supprimer l'index invalide avant de relancer.")).toEqual([]);
  });
});

describe("citeDuCode", () => {
  it("repère une citation entre accents graves", () => {
    expect(citeDuCode("`Array.prototype.at()` accepte un index négatif.")).toBe(true);
    expect(citeDuCode("Un index partiel porte une clause `WHERE`.")).toBe(true);
  });

  it("repère le code que l'extraction rend sans accents graves", () => {
    // Ce que le modèle écrit réellement dans ses concepts : ni balise, ni
    // accent grave, juste le nom tel qu'on le tape.
    expect(citeDuCode("L'instruction COPY se limite à copier des fichiers.")).toBe(true);
    expect(citeDuCode("Le délai passé à setTimeout est un minimum garanti.")).toBe(true);
    expect(citeDuCode("Promise.all rejette dès le premier échec.")).toBe(true);
    expect(citeDuCode("La variable DATABASE_URL utilise l'adresse interne.")).toBe(true);
  });

  it("ne se déclenche pas sur de la prose", () => {
    expect(citeDuCode("Une couche (celle du dessus) est reconstruite à chaque fois.")).toBe(false);
    expect(citeDuCode("La file des microtâches est vidée entre deux tâches.")).toBe(false);
    expect(citeDuCode("Le moteur exécute une tâche jusqu'au bout, puis vide la file.")).toBe(false);
  });
});

describe("controlerConcept, sur un concept anglais", () => {
  it("laisse passer un concept autoportant", () => {
    expect(
      controlerConcept("`Array.prototype.at()` accepts a negative index, counted from the end."),
    ).toEqual([]);
  });

  it("repère un renvoi au texte d'origine", () => {
    for (const concept of [
      "As mentioned above, the index starts from the end.",
      "The method described earlier rejects on the first failure.",
      "The aforementioned rule only applies to partial indexes.",
    ]) {
      expect(controlerConcept(concept).map((m) => m.regle)).toContain("renvoi");
    }
  });

  it("ne prend pas pour un renvoi un mot de prose", () => {
    // « above », « previously » décrivent le monde ici, pas un passage absent.
    expect(controlerConcept("Water above 100 °C turns into steam at sea level.")).toEqual([]);
    expect(controlerConcept("Myanmar was previously known as Burma.")).toEqual([]);
  });

  it("repère une ouverture qui reprend un antécédent absent", () => {
    expect(controlerConcept("This method accepts a negative index.").map((m) => m.regle)).toEqual([
      "antécédent",
    ]);
    expect(controlerConcept("They run before the title sequence.").map((m) => m.regle)).toEqual([
      "antécédent",
    ]);
  });

  it("laisse passer un « it » impersonnel", () => {
    expect(controlerConcept("It takes about 66 days for a habit to form.")).toEqual([]);
    expect(controlerConcept("It's safer to drop the invalid index before retrying.")).toEqual([]);
  });

  it("ne lit pas un mot français comme une ouverture anglaise", () => {
    expect(controlerConcept("Theodore Roosevelt reçoit le prix Nobel de la paix en 1906.")).toEqual(
      [],
    );
  });
});
