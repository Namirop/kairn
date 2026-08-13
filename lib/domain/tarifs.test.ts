import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  CATALOGUE,
  coutSelonConventions,
  facteurDuTarifReel,
  INTRODUCTION,
  tarifCatalogue,
  tarifReel,
  TARIF_PAR_DEFAUT,
} from "./tarifs";

const AVANT_FIN = "2026-08-13";
const JOUR_DE_FIN = "2026-08-31";
const APRES_FIN = "2026-09-01";

describe("tarifCatalogue", () => {
  it("rend le tarif du modèle quand il est connu", () => {
    expect(tarifCatalogue("claude-sonnet-5")).toEqual({
      entreePerMillion: 3,
      sortiePerMillion: 15,
    });
  });

  it("retient le plus cher pour un modèle inconnu, jamais le moins cher", () => {
    const inconnu = tarifCatalogue("claude-modele-qui-nexiste-pas");

    expect(inconnu).toEqual(TARIF_PAR_DEFAUT);

    for (const tarif of Object.values(CATALOGUE)) {
      expect(inconnu.entreePerMillion).toBeGreaterThanOrEqual(tarif.entreePerMillion);
      expect(inconnu.sortiePerMillion).toBeGreaterThanOrEqual(tarif.sortiePerMillion);
    }
  });
});

describe("tarifReel", () => {
  it("applique la remise pendant la période", () => {
    expect(tarifReel("claude-sonnet-5", AVANT_FIN)).toEqual({
      entreePerMillion: 2,
      sortiePerMillion: 10,
    });
  });

  /** Le dernier jour est inclus : « jusqu'au 31 » veut dire le 31 compris. */
  it("applique encore la remise le jour de fin, et plus le lendemain", () => {
    expect(tarifReel("claude-sonnet-5", JOUR_DE_FIN).entreePerMillion).toBe(2);
    expect(tarifReel("claude-sonnet-5", APRES_FIN).entreePerMillion).toBe(3);
  });

  it("rend le catalogue pour un modèle sans remise", () => {
    expect(tarifReel("claude-opus-5", AVANT_FIN)).toEqual(tarifCatalogue("claude-opus-5"));
  });
});

describe("facteurDuTarifReel", () => {
  it("vaut deux tiers sur le modèle en remise, et un après la remise", () => {
    expect(facteurDuTarifReel("claude-sonnet-5", AVANT_FIN)).toBeCloseTo(2 / 3, 12);
    expect(facteurDuTarifReel("claude-sonnet-5", APRES_FIN)).toBe(1);
  });

  it("vaut un pour un modèle sans remise", () => {
    expect(facteurDuTarifReel("claude-opus-5", AVANT_FIN)).toBe(1);
  });

  /**
   * La garde qui protège l'affichage.
   *
   * Un facteur unique n'a de sens que si l'entrée et la sortie sont réduites
   * dans la même proportion. Cette propriété tient aujourd'hui pour toutes les
   * remises de la table ; le jour où quelqu'un en ajoute une qui ne la respecte
   * pas, ce test tombe et l'oblige à traiter le cas plutôt qu'à afficher un
   * chiffre faux.
   */
  it("existe pour chaque remise déclarée", () => {
    for (const modele of Object.keys(INTRODUCTION)) {
      expect(facteurDuTarifReel(modele, AVANT_FIN)).not.toBeNull();
    }
  });

  it("ne rend jamais un facteur plus grand que un", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...Object.keys(CATALOGUE), "modele-inconnu"),
        fc.constantFrom(AVANT_FIN, JOUR_DE_FIN, APRES_FIN, "2025-01-01", "2099-12-31"),
        (modele, jour) => {
          const facteur = facteurDuTarifReel(modele, jour);

          if (facteur === null) return true;

          return facteur > 0 && facteur <= 1;
        },
      ),
      { numRuns: 200 },
    );
  });
});

describe("coutSelonConventions", () => {
  it("laisse le coût catalogue intact et calcule le réel", () => {
    const cout = coutSelonConventions(0.03, "claude-sonnet-5", AVANT_FIN);

    expect(cout.catalogue).toBe(0.03);
    expect(cout.reel).toBeCloseTo(0.02, 12);
  });

  it("fait se rejoindre les deux conventions une fois la remise expirée", () => {
    const cout = coutSelonConventions(0.03, "claude-sonnet-5", APRES_FIN);

    expect(cout.reel).toBe(cout.catalogue);
  });

  it("traite un coût nul sans produire de NaN", () => {
    const cout = coutSelonConventions(0, "claude-sonnet-5", AVANT_FIN);

    expect(cout.catalogue).toBe(0);
    expect(cout.reel).toBe(0);
  });

  /**
   * Le réel ne dépasse jamais le catalogue : c'est ce qui justifie d'enregistrer
   * le catalogue comme garde-fou de budget — il majore toujours la facture.
   */
  it("ne rend jamais un coût réel supérieur au catalogue", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 1000, noNaN: true }),
        fc.constantFrom(...Object.keys(CATALOGUE), "modele-inconnu"),
        fc.constantFrom(AVANT_FIN, APRES_FIN),
        (montant, modele, jour) => {
          const { catalogue, reel } = coutSelonConventions(montant, modele, jour);

          return reel === null || reel <= catalogue + 1e-12;
        },
      ),
      { numRuns: 300 },
    );
  });
});
