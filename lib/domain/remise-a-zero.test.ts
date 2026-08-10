import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { minutesAvantMinuit, quandRepartLeCompteur } from "./remise-a-zero";

const PARIS = "Europe/Paris";
const KATMANDOU = "Asia/Kathmandu";

describe("minutesAvantMinuit", () => {
  it("compte depuis l'heure de l'utilisateur, pas celle du serveur", () => {
    // 22 h 30 UTC, soit 23 h 30 à Paris en janvier : trente minutes.
    const instant = new Date("2026-01-15T22:30:00Z");

    expect(minutesAvantMinuit(instant, PARIS)).toBe(30);
    expect(minutesAvantMinuit(instant, "UTC")).toBe(90);
  });

  it("tient sur un fuseau à décalage non entier", () => {
    // 18 h 00 UTC, soit 23 h 45 à Katmandou (+5 h 45).
    expect(minutesAvantMinuit(new Date("2026-01-15T18:00:00Z"), KATMANDOU)).toBe(15);
  });
});

describe("quandRepartLeCompteur", () => {
  it("dit les minutes quand il en reste moins d'une heure", () => {
    expect(quandRepartLeCompteur(new Date("2026-01-15T22:30:00Z"), PARIS)).toBe("dans 30 minutes");
  });

  it("dit les heures quand la soirée est encore longue", () => {
    expect(quandRepartLeCompteur(new Date("2026-01-15T19:00:00Z"), PARIS)).toBe("dans 4 heures");
  });

  it("renvoie à minuit quand la journée entière reste", () => {
    expect(quandRepartLeCompteur(new Date("2026-01-15T08:00:00Z"), PARIS)).toBe("à minuit");
  });
});

describe("propriétés", () => {
  it("reste dans une journée, quel que soit l'instant et le fuseau", () => {
    fc.assert(
      fc.property(
        fc.date({
          min: new Date("2020-01-01T00:00:00Z"),
          max: new Date("2030-01-01T00:00:00Z"),
          noInvalidDate: true,
        }),
        fc.constantFrom(PARIS, KATMANDOU, "UTC", "Pacific/Auckland", "America/Los_Angeles"),
        (instant, fuseau) => {
          const minutes = minutesAvantMinuit(instant, fuseau);

          return minutes > 0 && minutes <= 24 * 60;
        },
      ),
      { numRuns: 300 },
    );
  });
});
