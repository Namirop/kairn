import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { dayToUtcDate, isSupportedTimeZone, jourSuivant, localDay, localHour } from "./local-day";

/** Repères horaires, écrits en UTC pour que l'intention soit lisible. */
const utc = (iso: string) => new Date(`${iso}Z`);

/**
 * Arbitraires partagés avec les autres tests du domaine.
 *
 * Les fuseaux sont tirés parmi ceux que la plateforme connaît vraiment, pas
 * parmi une poignée choisie à la main : c'est ce qui fait tomber les cas
 * exotiques — décalages d'une demi-heure ou d'un quart d'heure, changements
 * d'heure décalés, fuseaux qui ont changé de règle.
 */
export const unFuseau = fc.constantFrom(...Intl.supportedValuesOf("timeZone"));

export const unInstant = fc.date({
  min: new Date("2000-01-01T00:00:00Z"),
  max: new Date("2050-12-31T23:59:59Z"),
  noInvalidDate: true,
});

describe("localDay", () => {
  it("range un instant dans le jour civil de l'utilisateur, pas dans celui d'UTC", () => {
    // 23 h 30 UTC : déjà le lendemain à Paris, encore la veille à Los Angeles.
    const instant = utc("2026-03-10T23:30:00");

    expect(localDay(instant, "UTC")).toBe("2026-03-10");
    expect(localDay(instant, "Europe/Paris")).toBe("2026-03-11");
    expect(localDay(instant, "America/Los_Angeles")).toBe("2026-03-10");
    expect(localDay(instant, "Pacific/Auckland")).toBe("2026-03-11");
  });

  it("bascule de jour à minuit local, pas à minuit UTC", () => {
    // 22 h 59 puis 23 h 01 UTC, soit 23 h 59 puis 00 h 01 à Paris en hiver.
    expect(localDay(utc("2026-01-15T22:59:00"), "Europe/Paris")).toBe("2026-01-15");
    expect(localDay(utc("2026-01-15T23:01:00"), "Europe/Paris")).toBe("2026-01-16");
  });

  it("tient un fuseau à décalage non entier", () => {
    // Asia/Kolkata est à UTC+05:30 toute l'année.
    expect(localDay(utc("2026-06-01T18:29:00"), "Asia/Kolkata")).toBe("2026-06-01");
    expect(localDay(utc("2026-06-01T18:31:00"), "Asia/Kolkata")).toBe("2026-06-02");
  });

  it("traverse les deux passages à l'heure européens de 2026", () => {
    // 29 mars 2026 : 02 h 00 devient 03 h 00 à Paris (01 h 00 UTC).
    expect(localDay(utc("2026-03-29T00:59:00"), "Europe/Paris")).toBe("2026-03-29");
    expect(localDay(utc("2026-03-29T01:01:00"), "Europe/Paris")).toBe("2026-03-29");
    // 25 octobre 2026 : 03 h 00 redevient 02 h 00 à Paris.
    expect(localDay(utc("2026-10-25T00:59:00"), "Europe/Paris")).toBe("2026-10-25");
    expect(localDay(utc("2026-10-25T01:01:00"), "Europe/Paris")).toBe("2026-10-25");
  });
});

describe("localHour", () => {
  it("rend l'heure locale et non l'heure UTC", () => {
    const instant = utc("2026-01-15T23:30:00");

    expect(localHour(instant, "UTC")).toBe(23);
    expect(localHour(instant, "Europe/Paris")).toBe(0);
    expect(localHour(instant, "America/Los_Angeles")).toBe(15);
  });

  it("rend 0 à minuit local, jamais 24", () => {
    expect(localHour(utc("2026-01-15T23:00:00"), "Europe/Paris")).toBe(0);
    expect(localHour(utc("2026-06-01T22:00:00"), "Europe/Paris")).toBe(0);
  });

  it("saute l'heure inexistante du passage à l'heure d'été", () => {
    // À 01 h 00 UTC, Paris passe directement de 01 h 59 à 03 h 00 : 02 h n'existe pas.
    expect(localHour(utc("2026-03-29T00:30:00"), "Europe/Paris")).toBe(1);
    expect(localHour(utc("2026-03-29T01:30:00"), "Europe/Paris")).toBe(3);
  });

  it("rend deux fois la même heure au passage à l'heure d'hiver", () => {
    // 25 octobre : 02 h locale arrive à 00 h UTC puis à 01 h UTC.
    expect(localHour(utc("2026-10-25T00:30:00"), "Europe/Paris")).toBe(2);
    expect(localHour(utc("2026-10-25T01:30:00"), "Europe/Paris")).toBe(2);
  });

  it("tient un fuseau à décalage d'une demi-heure", () => {
    expect(localHour(utc("2026-06-01T12:00:00"), "Asia/Kolkata")).toBe(17);
  });
});

describe("isSupportedTimeZone", () => {
  it("accepte un identifiant IANA valide", () => {
    expect(isSupportedTimeZone("Europe/Brussels")).toBe(true);
    expect(isSupportedTimeZone("UTC")).toBe(true);
  });

  it("refuse un identifiant inconnu ou vide", () => {
    expect(isSupportedTimeZone("Europe/Atlantide")).toBe(false);
    expect(isSupportedTimeZone("")).toBe(false);
    expect(isSupportedTimeZone("   ")).toBe(false);
  });
});

describe("dayToUtcDate", () => {
  it("rend minuit UTC du jour donné", () => {
    expect(dayToUtcDate("2026-08-09").toISOString()).toBe("2026-08-09T00:00:00.000Z");
  });
});

describe("propriété : localDay conserve l'ordre du temps", () => {
  it("un instant antérieur n'a jamais un jour civil postérieur, quel que soit le fuseau", () => {
    fc.assert(
      fc.property(unInstant, unInstant, unFuseau, (a, b, fuseau) => {
        const [avant, apres] = a <= b ? [a, b] : [b, a];

        // Le format AAAA-MM-JJ se compare lexicographiquement comme
        // chronologiquement : pas besoin de le reparser pour l'ordonner.
        expect(localDay(avant, fuseau) <= localDay(apres, fuseau)).toBe(true);
      }),
      { numRuns: 500 },
    );
  });

  it("rend toujours un jour au format AAAA-MM-JJ que dayToUtcDate sait relire", () => {
    fc.assert(
      fc.property(unInstant, unFuseau, (instant, fuseau) => {
        const jour = localDay(instant, fuseau);

        expect(jour).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(Number.isNaN(dayToUtcDate(jour).getTime())).toBe(false);
      }),
      { numRuns: 500 },
    );
  });
});

describe("jourSuivant", () => {
  it("avance d'un cran", () => {
    expect(jourSuivant("2026-01-15")).toBe("2026-01-16");
  });

  it("passe un mois", () => {
    expect(jourSuivant("2026-01-31")).toBe("2026-02-01");
  });

  it("passe une année", () => {
    expect(jourSuivant("2026-12-31")).toBe("2027-01-01");
  });

  it("tient une année bissextile", () => {
    expect(jourSuivant("2028-02-28")).toBe("2028-02-29");
    expect(jourSuivant("2028-02-29")).toBe("2028-03-01");
  });

  it("avance même sur un jour local de 23 ou 25 heures", () => {
    // Passages à l'heure d'été et d'hiver en Europe en 2026 : l'étiquette du
    // jour avance d'un cran, quelle que soit la durée réelle de la journée.
    expect(jourSuivant("2026-03-29")).toBe("2026-03-30");
    expect(jourSuivant("2026-10-25")).toBe("2026-10-26");
  });

  it("rend toujours un jour relisible, et strictement postérieur", () => {
    fc.assert(
      fc.property(unInstant, unFuseau, (instant, fuseau) => {
        const jour = localDay(instant, fuseau);
        const suivant = jourSuivant(jour);

        expect(suivant).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(suivant > jour).toBe(true);
      }),
      { numRuns: 500 },
    );
  });
});
