import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  jourEnDateUtc,
  fuseauReconnu,
  jourSuivant,
  joursEntre,
  jourLocal,
  heureLocale,
} from "./jour-local";

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

describe("jourLocal", () => {
  it("range un instant dans le jour civil de l'utilisateur, pas dans celui d'UTC", () => {
    // 23 h 30 UTC : déjà le lendemain à Paris, encore la veille à Los Angeles.
    const instant = utc("2026-03-10T23:30:00");

    expect(jourLocal(instant, "UTC")).toBe("2026-03-10");
    expect(jourLocal(instant, "Europe/Paris")).toBe("2026-03-11");
    expect(jourLocal(instant, "America/Los_Angeles")).toBe("2026-03-10");
    expect(jourLocal(instant, "Pacific/Auckland")).toBe("2026-03-11");
  });

  it("bascule de jour à minuit local, pas à minuit UTC", () => {
    // 22 h 59 puis 23 h 01 UTC, soit 23 h 59 puis 00 h 01 à Paris en hiver.
    expect(jourLocal(utc("2026-01-15T22:59:00"), "Europe/Paris")).toBe("2026-01-15");
    expect(jourLocal(utc("2026-01-15T23:01:00"), "Europe/Paris")).toBe("2026-01-16");
  });

  it("tient un fuseau à décalage non entier", () => {
    // Asia/Kolkata est à UTC+05:30 toute l'année.
    expect(jourLocal(utc("2026-06-01T18:29:00"), "Asia/Kolkata")).toBe("2026-06-01");
    expect(jourLocal(utc("2026-06-01T18:31:00"), "Asia/Kolkata")).toBe("2026-06-02");
  });

  it("traverse les deux passages à l'heure européens de 2026", () => {
    // 29 mars 2026 : 02 h 00 devient 03 h 00 à Paris (01 h 00 UTC).
    expect(jourLocal(utc("2026-03-29T00:59:00"), "Europe/Paris")).toBe("2026-03-29");
    expect(jourLocal(utc("2026-03-29T01:01:00"), "Europe/Paris")).toBe("2026-03-29");
    // 25 octobre 2026 : 03 h 00 redevient 02 h 00 à Paris.
    expect(jourLocal(utc("2026-10-25T00:59:00"), "Europe/Paris")).toBe("2026-10-25");
    expect(jourLocal(utc("2026-10-25T01:01:00"), "Europe/Paris")).toBe("2026-10-25");
  });
});

describe("heureLocale", () => {
  it("rend l'heure locale et non l'heure UTC", () => {
    const instant = utc("2026-01-15T23:30:00");

    expect(heureLocale(instant, "UTC")).toBe(23);
    expect(heureLocale(instant, "Europe/Paris")).toBe(0);
    expect(heureLocale(instant, "America/Los_Angeles")).toBe(15);
  });

  it("rend 0 à minuit local, jamais 24", () => {
    expect(heureLocale(utc("2026-01-15T23:00:00"), "Europe/Paris")).toBe(0);
    expect(heureLocale(utc("2026-06-01T22:00:00"), "Europe/Paris")).toBe(0);
  });

  it("saute l'heure inexistante du passage à l'heure d'été", () => {
    // À 01 h 00 UTC, Paris passe directement de 01 h 59 à 03 h 00 : 02 h n'existe pas.
    expect(heureLocale(utc("2026-03-29T00:30:00"), "Europe/Paris")).toBe(1);
    expect(heureLocale(utc("2026-03-29T01:30:00"), "Europe/Paris")).toBe(3);
  });

  it("rend deux fois la même heure au passage à l'heure d'hiver", () => {
    // 25 octobre : 02 h locale arrive à 00 h UTC puis à 01 h UTC.
    expect(heureLocale(utc("2026-10-25T00:30:00"), "Europe/Paris")).toBe(2);
    expect(heureLocale(utc("2026-10-25T01:30:00"), "Europe/Paris")).toBe(2);
  });

  it("tient un fuseau à décalage d'une demi-heure", () => {
    expect(heureLocale(utc("2026-06-01T12:00:00"), "Asia/Kolkata")).toBe(17);
  });
});

describe("fuseauReconnu", () => {
  it("accepte un identifiant IANA valide", () => {
    expect(fuseauReconnu("Europe/Brussels")).toBe(true);
    expect(fuseauReconnu("UTC")).toBe(true);
  });

  it("refuse un identifiant inconnu ou vide", () => {
    expect(fuseauReconnu("Europe/Atlantide")).toBe(false);
    expect(fuseauReconnu("")).toBe(false);
    expect(fuseauReconnu("   ")).toBe(false);
  });
});

describe("jourEnDateUtc", () => {
  it("rend minuit UTC du jour donné", () => {
    expect(jourEnDateUtc("2026-08-09").toISOString()).toBe("2026-08-09T00:00:00.000Z");
  });
});

describe("propriété : jourLocal conserve l'ordre du temps", () => {
  it("un instant antérieur n'a jamais un jour civil postérieur, quel que soit le fuseau", () => {
    fc.assert(
      fc.property(unInstant, unInstant, unFuseau, (a, b, fuseau) => {
        const [avant, apres] = a <= b ? [a, b] : [b, a];

        // Le format AAAA-MM-JJ se compare lexicographiquement comme
        // chronologiquement : pas besoin de le reparser pour l'ordonner.
        expect(jourLocal(avant, fuseau) <= jourLocal(apres, fuseau)).toBe(true);
      }),
      { numRuns: 500 },
    );
  });

  it("rend toujours un jour au format AAAA-MM-JJ que jourEnDateUtc sait relire", () => {
    fc.assert(
      fc.property(unInstant, unFuseau, (instant, fuseau) => {
        const jour = jourLocal(instant, fuseau);

        expect(jour).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(Number.isNaN(jourEnDateUtc(jour).getTime())).toBe(false);
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
        const jour = jourLocal(instant, fuseau);
        const suivant = jourSuivant(jour);

        expect(suivant).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(suivant > jour).toBe(true);
      }),
      { numRuns: 500 },
    );
  });
});

describe("joursEntre", () => {
  it("compte les jours civils, pas les tranches de vingt-quatre heures", () => {
    expect(joursEntre("2026-08-16", "2026-08-17")).toBe(1);
    expect(joursEntre("2026-08-10", "2026-08-16")).toBe(6);
    expect(joursEntre("2026-08-16", "2026-08-16")).toBe(0);
  });

  it("rend un écart négatif quand le second jour précède", () => {
    expect(joursEntre("2026-08-17", "2026-08-16")).toBe(-1);
  });

  it("traverse les mois, les années et les bissextiles", () => {
    expect(joursEntre("2026-12-28", "2027-01-04")).toBe(7);
    expect(joursEntre("2028-02-28", "2028-03-01")).toBe(2);
  });

  it("ne compte pas une heure de plus ou de moins au changement d'heure", () => {
    // Journées locales de 23 h et de 25 h en Europe : l'écart de calendrier ne
    // s'en aperçoit pas, c'est tout l'intérêt de passer par les étiquettes.
    expect(joursEntre("2026-03-28", "2026-03-30")).toBe(2);
    expect(joursEntre("2026-10-24", "2026-10-26")).toBe(2);
  });

  it("est l'inverse de jourSuivant, et antisymétrique", () => {
    fc.assert(
      fc.property(unInstant, unInstant, unFuseau, (a, b, fuseau) => {
        const premier = jourLocal(a, fuseau);
        const second = jourLocal(b, fuseau);

        expect(joursEntre(premier, jourSuivant(premier))).toBe(1);
        expect(joursEntre(premier, second) + joursEntre(second, premier)).toBe(0);
      }),
      { numRuns: 300 },
    );
  });
});
