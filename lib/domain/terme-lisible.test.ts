import { describe, expect, it } from "vitest";
import { termeLisible } from "./terme-lisible";

describe("termeLisible", () => {
  it("nomme le jour et l'année", () => {
    expect(termeLisible(new Date("2026-10-12T09:00:00Z"), "Europe/Brussels", "fr-BE")).toBe(
      "12 octobre 2026",
    );
  });

  it("bascule d'un jour à l'est de l'UTC quand le terme tombe tard", () => {
    // 23 h 30 UTC le 11, c'est déjà le 12 à Paris. Afficher « 11 octobre »
    // ferait mentir l'écran d'une journée à toute l'Europe.
    const tardLe11 = new Date("2026-10-11T23:30:00Z");

    expect(termeLisible(tardLe11, "Europe/Paris", "fr-BE")).toBe("12 octobre 2026");
    expect(termeLisible(tardLe11, "UTC", "fr-BE")).toBe("11 octobre 2026");
  });

  it("reste la veille à l'ouest de l'UTC", () => {
    const tardLe11 = new Date("2026-10-11T23:30:00Z");

    expect(termeLisible(tardLe11, "America/New_York", "fr-BE")).toBe("11 octobre 2026");
  });

  it("tient les fuseaux à décalage non entier", () => {
    // Katmandou est à +05:45. Le décalage n'est pas un nombre d'heures, et une
    // arithmétique maison sur les heures se serait trompée ici.
    const presqueMinuit = new Date("2026-10-11T18:20:00Z");

    expect(termeLisible(presqueMinuit, "Asia/Kathmandu", "fr-BE")).toBe("12 octobre 2026");
  });

  it("dit le bon jour de part et d'autre d'un passage à l'heure", () => {
    // Dernier dimanche d'octobre 2026 : l'Europe recule d'une heure à 01 h UTC.
    const avant = new Date("2026-10-25T00:30:00Z");
    const apres = new Date("2026-10-25T01:30:00Z");

    expect(termeLisible(avant, "Europe/Paris", "fr-BE")).toBe("25 octobre 2026");
    expect(termeLisible(apres, "Europe/Paris", "fr-BE")).toBe("25 octobre 2026");
  });

  it("dit le jour dans la langue qu'on lui passe", () => {
    expect(termeLisible(new Date("2026-10-12T09:00:00Z"), "Europe/Brussels", "en-US")).toBe(
      "October 12, 2026",
    );
  });
});
