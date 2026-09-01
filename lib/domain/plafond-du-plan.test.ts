import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  type Abonnement,
  estPayant,
  PLAFOND_GRATUIT,
  PLAFOND_PAYANT,
  type Plan,
  plafondDeConcepts,
  planEffectif,
  SANS_ABONNEMENT,
} from "./plafond-du-plan";

const LE_12_A_MIDI = new Date("2026-09-12T12:00:00.000Z");
const PAYANTS: Plan[] = ["MENSUEL", "ANNUEL"];

describe("planEffectif", () => {
  it("laisse gratuit ce qui est gratuit, quelle que soit la date", () => {
    expect(planEffectif(SANS_ABONNEMENT, LE_12_A_MIDI)).toBe("GRATUIT");
    expect(
      planEffectif({ plan: "GRATUIT", finDePeriode: new Date("2099-01-01") }, LE_12_A_MIDI),
    ).toBe("GRATUIT");
  });

  it("tient un plan payant dont le terme est devant", () => {
    for (const plan of PAYANTS) {
      expect(
        planEffectif({ plan, finDePeriode: new Date("2026-10-12T12:00:00Z") }, LE_12_A_MIDI),
      ).toBe(plan);
    }
  });

  it("rend au gratuit un plan payant dont le terme est passé", () => {
    for (const plan of PAYANTS) {
      expect(
        planEffectif({ plan, finDePeriode: new Date("2026-09-11T12:00:00Z") }, LE_12_A_MIDI),
      ).toBe("GRATUIT");
    }
  });

  it("ferme à l'instant exact du terme, jamais après", () => {
    // Borne exclue, comme la fin d'une PeriodeDeQuota. Une milliseconde avant,
    // le droit court encore ; à l'instant pile, il a fini.
    const terme = LE_12_A_MIDI;

    expect(planEffectif({ plan: "MENSUEL", finDePeriode: terme }, LE_12_A_MIDI)).toBe("GRATUIT");
    expect(
      planEffectif({ plan: "MENSUEL", finDePeriode: new Date(terme.getTime() + 1) }, LE_12_A_MIDI),
    ).toBe("MENSUEL");
  });

  it("refuse un plan payant sans terme, plutôt que d'ouvrir un droit qui ne s'éteint jamais", () => {
    // Cet état n'existe que si un webhook a écrit le plan sans son terme. Le
    // refus est bruyant et se répare ; l'accord serait silencieux et éternel.
    for (const plan of PAYANTS) {
      expect(planEffectif({ plan, finDePeriode: null }, LE_12_A_MIDI)).toBe("GRATUIT");
    }
  });
});

describe("plafondDeConcepts", () => {
  it("donne le plafond gratuit à qui n'a rien payé", () => {
    expect(plafondDeConcepts(SANS_ABONNEMENT, LE_12_A_MIDI)).toBe(PLAFOND_GRATUIT);
  });

  it("donne le même plafond aux deux cadences de facturation", () => {
    const terme = new Date("2026-12-01T00:00:00Z");

    expect(plafondDeConcepts({ plan: "MENSUEL", finDePeriode: terme }, LE_12_A_MIDI)).toBe(
      PLAFOND_PAYANT,
    );
    expect(plafondDeConcepts({ plan: "ANNUEL", finDePeriode: terme }, LE_12_A_MIDI)).toBe(
      PLAFOND_PAYANT,
    );
  });

  it("ne descend jamais sous le plafond gratuit", () => {
    fc.assert(
      fc.property(
        fc.constantFrom<Plan>("GRATUIT", "MENSUEL", "ANNUEL"),
        fc.option(fc.date({ noInvalidDate: true }), { nil: null }),
        fc.date({ noInvalidDate: true }),
        (plan, finDePeriode, maintenant) => {
          expect(plafondDeConcepts({ plan, finDePeriode }, maintenant)).toBeGreaterThanOrEqual(
            PLAFOND_GRATUIT,
          );
        },
      ),
    );
  });

  it("ne remonte jamais avec le temps, pour un abonnement donné", () => {
    // La propriété qui compte vraiment : un droit acquis peut s'éteindre, il ne
    // peut pas renaître. Si elle tombe, c'est qu'une date a été comparée à
    // l'envers quelque part, et l'utilisateur verra son plafond clignoter.
    fc.assert(
      fc.property(
        fc.constantFrom<Plan>("GRATUIT", "MENSUEL", "ANNUEL"),
        fc.option(fc.date({ noInvalidDate: true }), { nil: null }),
        fc.date({ noInvalidDate: true }),
        fc.date({ noInvalidDate: true }),
        (plan, finDePeriode, a, b) => {
          const [tot, tard] = a.getTime() <= b.getTime() ? [a, b] : [b, a];
          const abonnement: Abonnement = { plan, finDePeriode };

          expect(plafondDeConcepts(abonnement, tard)).toBeLessThanOrEqual(
            plafondDeConcepts(abonnement, tot),
          );
        },
      ),
    );
  });
});

describe("estPayant", () => {
  it("dit non à qui n'a rien payé, et à qui a fini de payer", () => {
    expect(estPayant(SANS_ABONNEMENT, LE_12_A_MIDI)).toBe(false);
    expect(
      estPayant({ plan: "ANNUEL", finDePeriode: new Date("2026-01-01T00:00:00Z") }, LE_12_A_MIDI),
    ).toBe(false);
  });

  it("dit oui pendant que le terme court", () => {
    expect(
      estPayant({ plan: "ANNUEL", finDePeriode: new Date("2027-01-01T00:00:00Z") }, LE_12_A_MIDI),
    ).toBe(true);
  });

  it("dit exactement ce que le plafond dit", () => {
    fc.assert(
      fc.property(
        fc.constantFrom<Plan>("GRATUIT", "MENSUEL", "ANNUEL"),
        fc.option(fc.date({ noInvalidDate: true }), { nil: null }),
        fc.date({ noInvalidDate: true }),
        (plan, finDePeriode, maintenant) => {
          const abonnement: Abonnement = { plan, finDePeriode };
          const paye = estPayant(abonnement, maintenant);

          expect(plafondDeConcepts(abonnement, maintenant)).toBe(
            paye ? PLAFOND_PAYANT : PLAFOND_GRATUIT,
          );
        },
      ),
    );
  });
});
