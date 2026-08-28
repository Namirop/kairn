import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  ECRAN_MAX,
  lireLEcran,
  lireLeMessage,
  MESSAGE_MAX,
  MESSAGE_MIN,
  peutEncoreEnvoyer,
  resumerLeContexte,
  RETOURS_PAR_JOUR,
} from "./retour-sur-le-produit";

describe("lireLeMessage", () => {
  it("refuse une saisie vide", () => {
    expect(lireLeMessage("")).toBeNull();
  });

  it("refuse une saisie plus courte que la borne", () => {
    expect(lireLeMessage("ça bug")).toBeNull();
  });

  it("accepte à la borne exacte", () => {
    expect(lireLeMessage("a".repeat(MESSAGE_MIN))).toBe("a".repeat(MESSAGE_MIN));
  });

  it("refuse un dépassement d'un seul signe", () => {
    expect(lireLeMessage("a".repeat(MESSAGE_MAX + 1))).toBeNull();
  });

  it("ne compte pas les espaces de bord dans la mesure", () => {
    // Deux mots suivis de blancs ne font pas un retour de trente signes.
    expect(lireLeMessage(`ça bug${" ".repeat(30)}`)).toBeNull();
  });

  it("rend la saisie débarrassée de ses bords quand elle passe", () => {
    expect(lireLeMessage("   le bouton ne fait rien   ")).toBe("le bouton ne fait rien");
  });

  it("ne rend jamais une chaîne hors des bornes", () => {
    fc.assert(
      fc.property(fc.string({ maxLength: MESSAGE_MAX + 50 }), (saisie) => {
        const lu = lireLeMessage(saisie);

        if (lu === null) return;

        expect(lu.length).toBeGreaterThanOrEqual(MESSAGE_MIN);
        expect(lu.length).toBeLessThanOrEqual(MESSAGE_MAX);
        expect(lu).toBe(lu.trim());
      }),
    );
  });
});

describe("lireLEcran", () => {
  it("rend null sur une saisie vide ou blanche", () => {
    expect(lireLEcran("")).toBeNull();
    expect(lireLEcran("   ")).toBeNull();
  });

  it("coupe à sa borne sans refuser", () => {
    expect(lireLEcran("é".repeat(ECRAN_MAX + 40))).toHaveLength(ECRAN_MAX);
  });

  it("ne rend jamais plus long que sa borne", () => {
    fc.assert(
      fc.property(fc.string(), (saisie) => {
        expect((lireLEcran(saisie) ?? "").length).toBeLessThanOrEqual(ECRAN_MAX);
      }),
    );
  });
});

describe("peutEncoreEnvoyer", () => {
  it("laisse passer tant que le plafond n'est pas atteint", () => {
    expect(peutEncoreEnvoyer(0)).toBe(true);
    expect(peutEncoreEnvoyer(RETOURS_PAR_JOUR - 1)).toBe(true);
  });

  it("refuse à partir du plafond", () => {
    expect(peutEncoreEnvoyer(RETOURS_PAR_JOUR)).toBe(false);
    expect(peutEncoreEnvoyer(RETOURS_PAR_JOUR + 12)).toBe(false);
  });
});

describe("resumerLeContexte", () => {
  it("met la fenêtre devant le navigateur", () => {
    expect(resumerLeContexte(390, 844, "Mozilla/5.0 (iPhone)")).toBe(
      "390×844 · Mozilla/5.0 (iPhone)",
    );
  });

  it("arrondit une fenêtre fractionnaire", () => {
    expect(resumerLeContexte(390.4, 843.6, "X")).toBe("390×844 · X");
  });

  it("laisse tomber une fenêtre absurde plutôt que de l'écrire", () => {
    expect(resumerLeContexte(0, 0, "Chrome")).toBe("Chrome");
    expect(resumerLeContexte(Number.NaN, 844, "Chrome")).toBe("Chrome");
  });

  it("rend null quand il n'y a rien à dire", () => {
    expect(resumerLeContexte(0, 0, "   ")).toBeNull();
  });

  it("reste court quel que soit ce que le navigateur annonce", () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 4000 }), (agent) => {
        expect((resumerLeContexte(390, 844, agent) ?? "").length).toBeLessThanOrEqual(200);
      }),
    );
  });
});
