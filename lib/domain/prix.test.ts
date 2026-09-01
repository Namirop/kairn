import { describe, expect, it } from "vitest";
import { PRIX_ANNUEL, PRIX_MENSUEL } from "./prix";

describe("les deux prix", () => {
  it("tient la promesse écrite sur la page : deux mois offerts", () => {
    // La page annonce « deux mois offerts ». Changer un prix sans l'autre ne
    // casserait rien de visible — ça rendrait seulement la phrase fausse, et
    // c'est le genre de mensonge que personne ne remarque avant un client.
    expect(PRIX_ANNUEL).toBe(PRIX_MENSUEL * 10);
  });

  it("reste des entiers, pour se lire sans décimale", () => {
    expect(Number.isInteger(PRIX_MENSUEL)).toBe(true);
    expect(Number.isInteger(PRIX_ANNUEL)).toBe(true);
  });
});
