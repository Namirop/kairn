import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { joursEntre, localDay, localHour } from "./local-day";
import { unFuseau, unInstant } from "./local-day.test";
import {
  estLHeureDeLaRelance,
  JOURS_APRES_LESQUELS_ON_RENONCE,
  JOURS_AVANT_RELANCE,
} from "./relance-du-compte-vide";

const utc = (iso: string) => new Date(`${iso}Z`);

/** Un compte de Bruxelles, inscrit le 14 août, qui accepte d'être dérangé à 9 h. */
const bruxelles = (inscritLe: string, dailyReminderHour = 9) => ({
  timezone: "Europe/Brussels",
  dailyReminderHour,
  inscritLe: utc(inscritLe),
});

describe("estLHeureDeLaRelance", () => {
  it("relance le troisième jour, à l'heure dite chez l'utilisateur", () => {
    // 9 h à Bruxelles le 17, trois jours civils après une inscription le 14.
    expect(estLHeureDeLaRelance(utc("2026-08-17T07:10:00"), bruxelles("2026-08-14T15:00:00"))).toBe(
      true,
    );
  });

  it("ne dit rien aux autres heures du même jour", () => {
    for (const heureUtc of ["2026-08-17T06:10:00", "2026-08-17T08:10:00", "2026-08-17T20:10:00"]) {
      expect(estLHeureDeLaRelance(utc(heureUtc), bruxelles("2026-08-14T15:00:00"))).toBe(false);
    }
  });

  it("se tait avant le troisième jour", () => {
    for (const jour of ["2026-08-14", "2026-08-15", "2026-08-16"]) {
      expect(
        estLHeureDeLaRelance(utc(`${jour}T07:10:00`), bruxelles("2026-08-14T15:00:00")),
      ).toBe(false);
    }
  });

  it("rattrape le lendemain si le passage a sauté son tour", () => {
    // La fenêtre, et non un jour exact : une panne d'une heure le 17 ne doit pas
    // faire perdre la relance pour de bon.
    for (const jour of ["2026-08-18", "2026-08-20", "2026-09-13"]) {
      expect(estLHeureDeLaRelance(utc(`${jour}T07:10:00`), bruxelles("2026-08-14T15:00:00"))).toBe(
        true,
      );
    }
  });

  it("renonce passé la borne", () => {
    // 14 août + 30 jours = 13 septembre, dernier jour. Le 14, c'est fini.
    expect(estLHeureDeLaRelance(utc("2026-09-14T07:10:00"), bruxelles("2026-08-14T15:00:00"))).toBe(
      false,
    );
    expect(estLHeureDeLaRelance(utc("2027-02-14T08:10:00"), bruxelles("2026-08-14T15:00:00"))).toBe(
      false,
    );
  });

  it("lit l'heure chez l'utilisateur et pas en UTC", () => {
    const instant = utc("2026-08-17T07:10:00");
    const inscritLe = utc("2026-08-14T15:00:00");

    expect(
      estLHeureDeLaRelance(instant, { timezone: "Europe/Brussels", dailyReminderHour: 9, inscritLe }),
    ).toBe(true);
    expect(
      estLHeureDeLaRelance(instant, { timezone: "America/New_York", dailyReminderHour: 9, inscritLe }),
    ).toBe(false);
  });

  describe("le calendrier", () => {
    it("compte des jours civils et non des tranches de vingt-quatre heures", () => {
      // Inscrit à 23 h 50 le 14, local. Le 17 à 9 h, il s'est écoulé moins de
      // 82 heures — mais bien trois jours civils, et c'est ce qui compte.
      expect(
        estLHeureDeLaRelance(utc("2026-08-17T07:10:00"), bruxelles("2026-08-14T21:50:00")),
      ).toBe(true);
    });

    it("traite pareil le couche-tard et le lève-tôt du même jour", () => {
      const tard = bruxelles("2026-08-14T21:50:00"); // 23 h 50 local
      const tot = bruxelles("2026-08-14T22:10:00"); // 00 h 10 local, le 15

      // Inscrits à vingt minutes d'écart, mais deux jours civils différents :
      // leurs relances tombent donc à un jour d'écart, jamais au même moment.
      expect(estLHeureDeLaRelance(utc("2026-08-17T07:10:00"), tard)).toBe(true);
      expect(estLHeureDeLaRelance(utc("2026-08-17T07:10:00"), tot)).toBe(false);
      expect(estLHeureDeLaRelance(utc("2026-08-18T07:10:00"), tot)).toBe(true);
    });

    it("tient au passage à l'heure d'hiver", () => {
      // Bruxelles recule le 25 octobre 2026. Inscription le 23, relance le 26 :
      // la journée du 25 fait 25 heures, l'étiquette du jour avance d'un cran.
      const compte = bruxelles("2026-10-23T12:00:00");

      expect(estLHeureDeLaRelance(utc("2026-10-26T08:10:00"), compte)).toBe(true);
      expect(estLHeureDeLaRelance(utc("2026-10-26T07:10:00"), compte)).toBe(false);
    });

    it("tient au passage à l'heure d'été", () => {
      // Bruxelles avance le 29 mars 2026. La journée du 29 fait 23 heures.
      const compte = {
        timezone: "Europe/Brussels",
        dailyReminderHour: 9,
        inscritLe: utc("2026-03-27T12:00:00"),
      };

      expect(estLHeureDeLaRelance(utc("2026-03-30T07:10:00"), compte)).toBe(true);
      expect(estLHeureDeLaRelance(utc("2026-03-30T08:10:00"), compte)).toBe(false);
    });

    it("tient aux fuseaux à décalage non entier", () => {
      // Katmandou est à +5:45, Chatham à +12:45 — les deux cassent un calcul
      // qui supposerait des décalages en heures pleines.
      const katmandou = {
        timezone: "Asia/Kathmandu",
        dailyReminderHour: 9,
        inscritLe: utc("2026-08-14T06:00:00"),
      };
      const chatham = {
        timezone: "Pacific/Chatham",
        dailyReminderHour: 9,
        inscritLe: utc("2026-08-14T00:00:00"),
      };

      expect(localHour(utc("2026-08-17T03:20:00"), "Asia/Kathmandu")).toBe(9);
      expect(estLHeureDeLaRelance(utc("2026-08-17T03:20:00"), katmandou)).toBe(true);

      expect(localHour(utc("2026-08-16T20:20:00"), "Pacific/Chatham")).toBe(9);
      expect(estLHeureDeLaRelance(utc("2026-08-16T20:20:00"), chatham)).toBe(true);
    });

    it("tient de part et d'autre de l'UTC", () => {
      // Deux inscriptions au même instant, de part et d'autre de l'UTC : à
      // Auckland (+12) il est déjà le 15, à Los Angeles (-7) encore le 14. Leur
      // troisième jour n'est donc pas le même, et c'est le calendrier de chacun
      // qui tranche — pas la date UTC commune.
      const inscritLe = utc("2026-08-14T12:00:00");

      const auckland = { timezone: "Pacific/Auckland", dailyReminderHour: 9, inscritLe };
      const losAngeles = { timezone: "America/Los_Angeles", dailyReminderHour: 9, inscritLe };

      expect(localDay(inscritLe, "Pacific/Auckland")).toBe("2026-08-15");
      expect(localDay(inscritLe, "America/Los_Angeles")).toBe("2026-08-14");

      // 9 h du 18 à Auckland, 9 h du 17 à Los Angeles : trois jours chacun.
      expect(estLHeureDeLaRelance(utc("2026-08-17T21:10:00"), auckland)).toBe(true);
      expect(estLHeureDeLaRelance(utc("2026-08-17T16:10:00"), losAngeles)).toBe(true);

      // Et la veille de son propre troisième jour, chacun se tait.
      expect(estLHeureDeLaRelance(utc("2026-08-16T21:10:00"), auckland)).toBe(false);
      expect(estLHeureDeLaRelance(utc("2026-08-16T16:10:00"), losAngeles)).toBe(false);
    });
  });

  describe("propriétés", () => {
    it("ne relance jamais hors de l'heure dite", () => {
      fc.assert(
        fc.property(
          unInstant,
          unFuseau,
          unInstant,
          fc.integer({ min: 0, max: 23 }),
          (maintenant, timezone, inscritLe, dailyReminderHour) => {
            if (localHour(maintenant, timezone) === dailyReminderHour) return true;

            return !estLHeureDeLaRelance(maintenant, { timezone, dailyReminderHour, inscritLe });
          },
        ),
      );
    });

    it("ne relance jamais hors de la fenêtre, quel que soit le fuseau", () => {
      fc.assert(
        fc.property(unInstant, unFuseau, unInstant, (maintenant, timezone, inscritLe) => {
          const dailyReminderHour = localHour(maintenant, timezone);
          const age = joursEntre(localDay(inscritLe, timezone), localDay(maintenant, timezone));
          const dansLaFenetre =
            age >= JOURS_AVANT_RELANCE && age <= JOURS_APRES_LESQUELS_ON_RENONCE;

          return (
            estLHeureDeLaRelance(maintenant, { timezone, dailyReminderHour, inscritLe }) ===
            dansLaFenetre
          );
        }),
      );
    });

    it("ne relance jamais un compte inscrit dans le futur", () => {
      fc.assert(
        fc.property(unInstant, unFuseau, fc.integer({ min: 1, max: 400 }), (maintenant, timezone, jours) => {
          const inscritLe = new Date(maintenant.getTime() + jours * 24 * 60 * 60 * 1000);
          const dailyReminderHour = localHour(maintenant, timezone);

          return !estLHeureDeLaRelance(maintenant, { timezone, dailyReminderHour, inscritLe });
        }),
      );
    });

    it("rend toujours la même réponse pour les mêmes entrées", () => {
      fc.assert(
        fc.property(
          unInstant,
          unFuseau,
          unInstant,
          fc.integer({ min: 0, max: 23 }),
          (maintenant, timezone, inscritLe, dailyReminderHour) => {
            const compte = { timezone, dailyReminderHour, inscritLe };

            return (
              estLHeureDeLaRelance(maintenant, compte) === estLHeureDeLaRelance(maintenant, compte)
            );
          },
        ),
      );
    });
  });
});
