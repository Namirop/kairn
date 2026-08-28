import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { periodeDeQuota } from "./periode-de-quota";

const PARIS = "Europe/Paris";
const LOS_ANGELES = "America/Los_Angeles";

function le(jour: string, heure = "12:00:00"): Date {
  return new Date(`${jour}T${heure}Z`);
}

describe("periodeDeQuota", () => {
  it("ouvre la première période le jour de l'inscription", () => {
    expect(periodeDeQuota(le("2026-03-12"), le("2026-03-12"), PARIS)).toEqual({
      debut: "2026-03-12",
      fin: "2026-04-12",
    });
  });

  it("tient la période tant que le jour d'ancrage n'est pas repassé", () => {
    expect(periodeDeQuota(le("2026-03-12"), le("2026-04-11"), PARIS)).toEqual({
      debut: "2026-03-12",
      fin: "2026-04-12",
    });
  });

  it("bascule le jour d'ancrage, pas le premier du mois", () => {
    expect(periodeDeQuota(le("2026-03-12"), le("2026-04-12"), PARIS)).toEqual({
      debut: "2026-04-12",
      fin: "2026-05-12",
    });
  });

  it("enjambe plusieurs mois sans dériver", () => {
    expect(periodeDeQuota(le("2026-03-12"), le("2026-09-20"), PARIS)).toEqual({
      debut: "2026-09-12",
      fin: "2026-10-12",
    });
  });

  it("enjambe un changement d'année", () => {
    expect(periodeDeQuota(le("2026-11-20"), le("2027-01-15"), PARIS)).toEqual({
      debut: "2026-12-20",
      fin: "2027-01-20",
    });
  });

  /**
   * Une inscription le 31 : les mois courts basculent à leur dernier jour, et le
   * 31 revient dès qu'un mois le porte. Glisser définitivement au 28 ferait
   * dériver la date d'ancrage de trois jours par an.
   */
  it("ramène l'ancrage au dernier jour d'un mois trop court, sans le perdre", () => {
    expect(periodeDeQuota(le("2026-01-31"), le("2026-02-15"), PARIS)).toEqual({
      debut: "2026-01-31",
      fin: "2026-02-28",
    });
    expect(periodeDeQuota(le("2026-01-31"), le("2026-03-01"), PARIS)).toEqual({
      debut: "2026-02-28",
      fin: "2026-03-31",
    });
    expect(periodeDeQuota(le("2026-01-31"), le("2026-04-02"), PARIS)).toEqual({
      debut: "2026-03-31",
      fin: "2026-04-30",
    });
  });

  it("tient une inscription le 29 février", () => {
    expect(periodeDeQuota(le("2028-02-29"), le("2028-03-15"), PARIS)).toEqual({
      debut: "2028-02-29",
      fin: "2028-03-29",
    });
  });

  it("compte dans le calendrier de l'utilisateur, pas en UTC", () => {
    // 23 h 30 UTC le 11 = 00 h 30 le 12 à Paris : sa période a basculé.
    const instant = le("2026-04-11", "23:30:00");

    expect(periodeDeQuota(le("2026-03-12"), instant, PARIS).debut).toBe("2026-04-12");
    // Le même instant à Los Angeles : il est encore le 11 chez lui.
    expect(periodeDeQuota(le("2026-03-12"), instant, LOS_ANGELES).debut).toBe("2026-03-12");
  });

  it("ne commence jamais avant l'inscription", () => {
    expect(periodeDeQuota(le("2026-03-12"), le("2026-02-01"), PARIS).debut).toBe("2026-03-12");
  });

  it("encadre toujours le jour observé", () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date("2024-01-01"), max: new Date("2027-12-31"), noInvalidDate: true }),
        fc.integer({ min: 0, max: 900 }),
        (inscription, joursApres) => {
          const maintenant = new Date(inscription.getTime() + joursApres * 24 * 60 * 60 * 1000);
          const { debut, fin } = periodeDeQuota(inscription, maintenant, "UTC");
          const jour = maintenant.toISOString().slice(0, 10);

          return debut <= jour && jour < fin;
        },
      ),
      { numRuns: 500 },
    );
  });

  it("enchaîne les périodes sans trou ni recouvrement", () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date("2024-01-01"), max: new Date("2027-06-30"), noInvalidDate: true }),
        fc.integer({ min: 0, max: 700 }),
        (inscription, joursApres) => {
          const maintenant = new Date(inscription.getTime() + joursApres * 24 * 60 * 60 * 1000);
          const courante = periodeDeQuota(inscription, maintenant, "UTC");
          // Le premier instant de la période suivante ouvre bien celle qui suit.
          const suivante = periodeDeQuota(
            inscription,
            new Date(`${courante.fin}T00:00:00Z`),
            "UTC",
          );

          return suivante.debut === courante.fin;
        },
      ),
      { numRuns: 500 },
    );
  });
});
