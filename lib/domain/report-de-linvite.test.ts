import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  inviteEnSommeil,
  REFUS_AVANT_SILENCE,
  SOMMEIL_JOURS,
  type RefusDInstallation,
} from "./report-de-linvite";

const MS_PAR_JOUR = 24 * 60 * 60 * 1000;

/** Un instant de référence, en UTC, pour ne rien devoir au fuseau de la machine. */
const MAINTENANT = new Date("2026-08-18T12:00:00.000Z");

function refusIlYA(jours: number, compte = 1): RefusDInstallation {
  return { compte, dernier: new Date(MAINTENANT.getTime() - jours * MS_PAR_JOUR) };
}

describe("inviteEnSommeil", () => {
  it("propose à qui n'a jamais rien écarté", () => {
    expect(inviteEnSommeil(null, MAINTENANT)).toBe(false);
  });

  it("se tait le lendemain d'un refus", () => {
    expect(inviteEnSommeil(refusIlYA(1), MAINTENANT)).toBe(true);
  });

  it("se tait encore la veille du réveil", () => {
    expect(inviteEnSommeil(refusIlYA(SOMMEIL_JOURS - 1), MAINTENANT)).toBe(true);
  });

  it("se réveille pile au bout du sommeil, et pas une seconde avant", () => {
    const veille = new Date(MAINTENANT.getTime() - (SOMMEIL_JOURS * MS_PAR_JOUR - 1));
    const pile = new Date(MAINTENANT.getTime() - SOMMEIL_JOURS * MS_PAR_JOUR);

    expect(inviteEnSommeil({ compte: 1, dernier: veille }, MAINTENANT)).toBe(true);
    expect(inviteEnSommeil({ compte: 1, dernier: pile }, MAINTENANT)).toBe(false);
  });

  it("s'éteint pour de bon au second refus, si vieux soit-il", () => {
    expect(inviteEnSommeil(refusIlYA(1, REFUS_AVANT_SILENCE), MAINTENANT)).toBe(true);
    expect(inviteEnSommeil(refusIlYA(3650, REFUS_AVANT_SILENCE), MAINTENANT)).toBe(true);
  });

  it("se tait aussi sur un refus daté du futur, plutôt que d'insister", () => {
    const futur = { compte: 1, dernier: new Date(MAINTENANT.getTime() + MS_PAR_JOUR) };

    expect(inviteEnSommeil(futur, MAINTENANT)).toBe(true);
  });

  /**
   * Le sommeil se mesure en durée absolue : un passage à l'heure d'hiver ne
   * déplace pas sa frontière. Ces deux instants encadrent le changement du 25
   * octobre 2026 en Europe, où une même journée locale dure vingt-cinq heures.
   */
  it("ne se laisse pas décaler par un passage à l'heure d'hiver", () => {
    const avantLeChangement = new Date("2026-10-20T22:30:00.000Z");
    const trenteJoursApres = new Date(avantLeChangement.getTime() + SOMMEIL_JOURS * MS_PAR_JOUR);
    const uneSecondeAvant = new Date(trenteJoursApres.getTime() - 1000);

    expect(inviteEnSommeil({ compte: 1, dernier: avantLeChangement }, uneSecondeAvant)).toBe(true);
    expect(inviteEnSommeil({ compte: 1, dernier: avantLeChangement }, trenteJoursApres)).toBe(
      false,
    );
  });

  it("ne se réveille jamais avant l'heure, quel que soit le délai", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: SOMMEIL_JOURS * 24 * 60 - 1 }), (minutes) => {
        const dernier = new Date(MAINTENANT.getTime() - minutes * 60 * 1000);

        expect(inviteEnSommeil({ compte: 1, dernier }, MAINTENANT)).toBe(true);
      }),
      { numRuns: 200 },
    );
  });

  it("est toujours silencieuse au-delà du compte de refus, quel que soit l'écart", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: REFUS_AVANT_SILENCE, max: 50 }),
        fc.integer({ min: 0, max: 10_000 }),
        (compte, jours) => {
          expect(inviteEnSommeil(refusIlYA(jours, compte), MAINTENANT)).toBe(true);
        },
      ),
      { numRuns: 200 },
    );
  });
});
