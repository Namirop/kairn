import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { anciennete, delaiAvant, delaiAvantLeJour, echeanceCourte, joursAvant } from "./echeance";
import { localDay } from "./local-day";
import { unFuseau, unInstant } from "./local-day.test";

const utc = (iso: string) => new Date(`${iso}Z`);

const PARIS = "Europe/Paris";
const KOLKATA = "Asia/Kolkata";

describe("joursAvant", () => {
  it("rend zéro pour une échéance dans le jour civil de l'utilisateur", () => {
    const maintenant = utc("2026-06-15T10:00:00");

    expect(joursAvant(utc("2026-06-15T10:00:00"), maintenant, PARIS)).toBe(0);
    expect(joursAvant(utc("2026-06-15T21:59:00"), maintenant, PARIS)).toBe(0);
  });

  it("compte des jours civils, pas des tranches de vingt-quatre heures", () => {
    // Deux heures d'écart, mais deux jours civils différents à Paris.
    const maintenant = utc("2026-06-15T21:00:00"); // 23 h à Paris
    const echeance = utc("2026-06-15T23:00:00"); // 01 h le 16 à Paris

    expect(joursAvant(echeance, maintenant, PARIS)).toBe(1);
    expect(joursAvant(echeance, maintenant, "UTC")).toBe(0);
  });

  it("rend un nombre négatif pour une échéance dépassée", () => {
    const maintenant = utc("2026-06-15T10:00:00");

    expect(joursAvant(utc("2026-06-14T10:00:00"), maintenant, PARIS)).toBe(-1);
    expect(joursAvant(utc("2026-05-16T10:00:00"), maintenant, PARIS)).toBe(-30);
  });

  it("compte un an sans se décaler malgré les deux changements d'heure", () => {
    expect(joursAvant(utc("2027-06-15T10:00:00"), utc("2026-06-15T10:00:00"), PARIS)).toBe(365);
  });

  it("donne le même écart de part et d'autre d'un passage à l'heure", () => {
    // Le 29 mars 2026, la journée parisienne ne dure que 23 heures.
    const veille = utc("2026-03-28T12:00:00");
    const lendemain = utc("2026-03-29T12:00:00");

    expect(joursAvant(lendemain, veille, PARIS)).toBe(1);
    expect(joursAvant(veille, lendemain, PARIS)).toBe(-1);
  });

  it("tient un fuseau à décalage d'une demi-heure", () => {
    // 18 h 45 UTC : déjà le lendemain à Kolkata (UTC+05:30), pas encore en UTC.
    const maintenant = utc("2026-06-15T18:45:00");

    expect(joursAvant(utc("2026-06-16T05:00:00"), maintenant, KOLKATA)).toBe(0);
    expect(joursAvant(utc("2026-06-16T05:00:00"), maintenant, "UTC")).toBe(1);
  });
});

describe("echeanceCourte", () => {
  const maintenant = utc("2026-06-15T10:00:00");

  it("nomme le jour courant, les retards et les échéances à venir", () => {
    expect(echeanceCourte(utc("2026-06-15T23:00:00"), maintenant, "UTC")).toBe("auj.");
    expect(echeanceCourte(utc("2026-06-14T10:00:00"), maintenant, "UTC")).toBe("−1 j");
    expect(echeanceCourte(utc("2026-06-16T10:00:00"), maintenant, "UTC")).toBe("1 j");
    expect(echeanceCourte(utc("2026-07-10T10:00:00"), maintenant, "UTC")).toBe("25 j");
  });

  it("bascule en mois à partir de trente jours", () => {
    expect(echeanceCourte(utc("2026-07-15T10:00:00"), maintenant, "UTC")).toBe("1 mois");
    expect(echeanceCourte(utc("2027-06-15T10:00:00"), maintenant, "UTC")).toBe("12 mois");
  });

  it("dit « auj. » à 00 h 05 comme à 23 h 55, heure locale", () => {
    const justeApresMinuit = utc("2026-06-14T22:05:00"); // 00 h 05 le 15 à Paris
    const justeAvantMinuit = utc("2026-06-15T21:55:00"); // 23 h 55 le 15 à Paris
    const dansLaJournee = utc("2026-06-15T12:00:00");

    expect(echeanceCourte(dansLaJournee, justeApresMinuit, PARIS)).toBe("auj.");
    expect(echeanceCourte(dansLaJournee, justeAvantMinuit, PARIS)).toBe("auj.");
  });
});

describe("anciennete", () => {
  const maintenant = utc("2026-06-15T10:00:00");

  it("nomme les dépôts récents en prose", () => {
    expect(anciennete(utc("2026-06-15T08:00:00"), maintenant, "UTC")).toBe("aujourd'hui");
    expect(anciennete(utc("2026-06-14T08:00:00"), maintenant, "UTC")).toBe("hier");
    expect(anciennete(utc("2026-06-09T08:00:00"), maintenant, "UTC")).toBe("il y a 6 jours");
    // 29 jours : dernier palier avant la bascule en mois.
    expect(anciennete(utc("2026-05-17T08:00:00"), maintenant, "UTC")).toBe("il y a 29 jours");
  });

  it("bascule en mois à partir de trente jours", () => {
    expect(anciennete(utc("2026-05-16T08:00:00"), maintenant, "UTC")).toBe("il y a un mois");
    expect(anciennete(utc("2026-04-20T08:00:00"), maintenant, "UTC")).toBe("il y a un mois");
    expect(anciennete(utc("2026-01-15T08:00:00"), maintenant, "UTC")).toBe("il y a 5 mois");
  });

  it("ne rend jamais d'ancienneté négative pour un instant futur", () => {
    expect(anciennete(utc("2026-06-20T08:00:00"), maintenant, "UTC")).toBe("aujourd'hui");
  });
});

describe("propriété : le jour civil de l'utilisateur fait foi", () => {
  it("toute échéance tombant dans son jour civil s'affiche « auj. »", () => {
    fc.assert(
      fc.property(
        unInstant,
        fc.integer({ min: -1440, max: 1440 }),
        unFuseau,
        (maintenant, decalageMinutes, fuseau) => {
          const echeance = new Date(maintenant.getTime() + decalageMinutes * 60_000);

          // On ne garde que les tirages qui tombent réellement dans le même
          // jour civil : c'est la prémisse de la propriété, pas son objet.
          fc.pre(localDay(echeance, fuseau) === localDay(maintenant, fuseau));

          expect(echeanceCourte(echeance, maintenant, fuseau)).toBe("auj.");
          expect(joursAvant(echeance, maintenant, fuseau)).toBe(0);
        },
      ),
      { numRuns: 800 },
    );
  });

  it("un instant hors du jour civil ne s'affiche jamais « auj. »", () => {
    fc.assert(
      fc.property(
        unInstant,
        fc.integer({ min: -1440, max: 1440 }),
        unFuseau,
        (maintenant, decalageMinutes, fuseau) => {
          const echeance = new Date(maintenant.getTime() + decalageMinutes * 60_000);

          fc.pre(localDay(echeance, fuseau) !== localDay(maintenant, fuseau));

          expect(echeanceCourte(echeance, maintenant, fuseau)).not.toBe("auj.");
          expect(joursAvant(echeance, maintenant, fuseau)).not.toBe(0);
        },
      ),
      { numRuns: 800 },
    );
  });
});

describe("propriété : joursAvant est antisymétrique", () => {
  it("inverser les deux instants inverse le signe du résultat", () => {
    fc.assert(
      fc.property(unInstant, unInstant, unFuseau, (a, b, fuseau) => {
        // Énoncée comme une somme nulle plutôt que `x === -y` : la négation de
        // zéro donne −0, et `Object.is(+0, −0)` est faux. Le contenu
        // mathématique est le même, l'assertion ne bute plus sur la
        // représentation du zéro.
        expect(joursAvant(a, b, fuseau) + joursAvant(b, a, fuseau)).toBe(0);
        expect(Math.abs(joursAvant(a, b, fuseau))).toBe(Math.abs(joursAvant(b, a, fuseau)));
      }),
      { numRuns: 500 },
    );
  });

  it("rend zéro quand les deux instants sont le même", () => {
    fc.assert(
      fc.property(unInstant, unFuseau, (instant, fuseau) => {
        expect(joursAvant(instant, instant, fuseau)).toBe(0);
      }),
      { numRuns: 300 },
    );
  });
});

describe("delaiAvant", () => {
  const maintenant = new Date("2026-01-15T09:00:00Z");

  it("dit demain pour le jour suivant", () => {
    expect(delaiAvant(new Date("2026-01-16T08:00:00Z"), maintenant, PARIS)).toBe("demain");
  });

  it("compte en jours civils, pas en heures", () => {
    // Douze heures plus tard mais déjà le lendemain à Paris : c'est « demain »,
    // pas « aujourd'hui ».
    expect(delaiAvant(new Date("2026-01-15T23:30:00Z"), maintenant, PARIS)).toBe("demain");
  });

  it("dit aujourd'hui pour une échéance déjà passée", () => {
    expect(delaiAvant(new Date("2026-01-10T08:00:00Z"), maintenant, PARIS)).toBe("aujourd'hui");
    expect(delaiAvant(new Date("2026-01-15T02:00:00Z"), maintenant, PARIS)).toBe("aujourd'hui");
  });

  it("passe aux mois quand l'échéance est lointaine", () => {
    expect(delaiAvant(new Date("2026-02-10T08:00:00Z"), maintenant, PARIS)).toBe("dans 26 jours");
    expect(delaiAvant(new Date("2026-03-01T08:00:00Z"), maintenant, PARIS)).toBe("dans un mois");
    expect(delaiAvant(new Date("2026-07-15T08:00:00Z"), maintenant, PARIS)).toBe("dans 6 mois");
  });

  it("ne dit jamais un retard, quel que soit l'écart", () => {
    fc.assert(
      fc.property(fc.integer({ min: -400, max: 400 }), (jours) => {
        const echeance = new Date(maintenant.getTime() + jours * 24 * 60 * 60 * 1000);

        return !delaiAvant(echeance, maintenant, PARIS).includes("−");
      }),
      { numRuns: 300 },
    );
  });
});

describe("delaiAvantLeJour", () => {
  const maintenant = new Date("2026-01-15T09:00:00Z");

  it("dit demain pour le jour suivant", () => {
    expect(delaiAvantLeJour("2026-01-16", maintenant, PARIS)).toBe("demain");
  });

  it("dit aujourd'hui pour le jour courant", () => {
    expect(delaiAvantLeJour("2026-01-15", maintenant, PARIS)).toBe("aujourd'hui");
  });

  it("se cale sur le calendrier de l'utilisateur, pas sur UTC", () => {
    // 23 h 30 UTC le 15 : il est déjà le 16 à Paris, donc le 17 est « demain ».
    const tard = new Date("2026-01-15T23:30:00Z");

    expect(delaiAvantLeJour("2026-01-17", tard, PARIS)).toBe("demain");
    expect(delaiAvantLeJour("2026-01-17", tard, "UTC")).toBe("dans 2 jours");
  });

  it("passe aux mois de la même façon que delaiAvant", () => {
    expect(delaiAvantLeJour("2026-07-15", maintenant, PARIS)).toBe("dans 6 mois");
  });
});
