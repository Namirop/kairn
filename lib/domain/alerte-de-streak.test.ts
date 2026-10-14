import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { estLHeureDeLAlerte, HEURE_DE_LALERTE, serieEnSursis } from "./alerte-de-streak";
import { jourLocal, heureLocale } from "./jour-local";
import { unFuseau, unInstant } from "./jour-local.test";

const utc = (iso: string) => new Date(`${iso}Z`);

describe("estLHeureDeLAlerte", () => {
  it("alerte à vingt-et-une heures chez l'utilisateur", () => {
    // 21 h à Bruxelles.
    expect(
      estLHeureDeLAlerte(utc("2026-08-17T19:10:00"), {
        timezone: "Europe/Brussels",
        dailyReminderHour: 8,
      }),
    ).toBe(true);
  });

  it("ne dit rien aux autres heures", () => {
    expect(
      estLHeureDeLAlerte(utc("2026-08-17T18:10:00"), {
        timezone: "Europe/Brussels",
        dailyReminderHour: 8,
      }),
    ).toBe(false);
  });

  it("lit l'heure chez l'utilisateur et pas en UTC", () => {
    const instant = utc("2026-08-17T19:10:00");

    expect(estLHeureDeLAlerte(instant, { timezone: "Europe/Brussels", dailyReminderHour: 8 })).toBe(
      true,
    );
    expect(
      estLHeureDeLAlerte(instant, { timezone: "America/New_York", dailyReminderHour: 8 }),
    ).toBe(false);
  });

  it("se tait quand le rappel quotidien tombe déjà aussi tard", () => {
    const instant = utc("2026-08-17T19:10:00");

    for (const dailyReminderHour of [21, 22, 23]) {
      expect(estLHeureDeLAlerte(instant, { timezone: "Europe/Brussels", dailyReminderHour })).toBe(
        false,
      );
    }
  });

  it("n'alerte jamais à une autre heure locale que la sienne", () => {
    fc.assert(
      fc.property(unInstant, unFuseau, fc.integer({ min: 0, max: 20 }), (instant, fuseau, h) => {
        const alerte = estLHeureDeLAlerte(instant, { timezone: fuseau, dailyReminderHour: h });

        return alerte === (heureLocale(instant, fuseau) === HEURE_DE_LALERTE);
      }),
      { numRuns: 400 },
    );
  });
});

describe("serieEnSursis", () => {
  const maintenant = utc("2026-08-17T19:10:00");
  const bruxelles = { timezone: "Europe/Brussels", currentStreak: 12 };

  it("est en sursis quand rien n'a été fait aujourd'hui", () => {
    expect(serieEnSursis(maintenant, { ...bruxelles, dernierJourRevise: "2026-08-16" })).toBe(true);
  });

  it("n'est pas en sursis quand la journée est déjà faite", () => {
    expect(serieEnSursis(maintenant, { ...bruxelles, dernierJourRevise: "2026-08-17" })).toBe(
      false,
    );
  });

  it("n'alerte pas qui n'a pas de série à perdre", () => {
    expect(
      serieEnSursis(maintenant, { ...bruxelles, currentStreak: 0, dernierJourRevise: null }),
    ).toBe(false);
  });

  it("est en sursis pour qui n'a jamais rien fait mais porte une série", () => {
    // Cas de bord improbable en base ; on ne veut pas qu'il rende `false` par
    // accident de comparaison avec `null`.
    expect(serieEnSursis(maintenant, { ...bruxelles, dernierJourRevise: null })).toBe(true);
  });

  it("compare le jour de l'utilisateur, pas celui du serveur", () => {
    // 00 h 10 à Sydney le 18, encore le 17 à Bruxelles : la même seconde ne
    // laisse pas les deux comptes dans le même état.
    const minuitPasse = utc("2026-08-17T14:10:00");

    expect(
      serieEnSursis(minuitPasse, {
        timezone: "Australia/Sydney",
        currentStreak: 3,
        dernierJourRevise: "2026-08-17",
      }),
    ).toBe(true);
    expect(
      serieEnSursis(minuitPasse, {
        timezone: "Europe/Brussels",
        currentStreak: 3,
        dernierJourRevise: "2026-08-17",
      }),
    ).toBe(false);
  });

  it("ne dépend que du jour local et de la série", () => {
    fc.assert(
      fc.property(unInstant, unFuseau, fc.nat({ max: 40 }), (instant, fuseau, serie) => {
        const jour = jourLocal(instant, fuseau);
        const sursis = serieEnSursis(instant, {
          timezone: fuseau,
          currentStreak: serie,
          dernierJourRevise: jour,
        });

        return sursis === false;
      }),
      { numRuns: 300 },
    );
  });
});
