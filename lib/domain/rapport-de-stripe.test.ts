import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { planEffectif } from "./plafond-du-plan";
import {
  abonnementVivant,
  type CadenceStripe,
  etatDepuisStripe,
  evenementARetenir,
  planDeLaCadence,
  type RapportDeStripe,
  type StatutStripe,
} from "./rapport-de-stripe";

const TOUS_LES_STATUTS: StatutStripe[] = [
  "active",
  "trialing",
  "past_due",
  "canceled",
  "incomplete",
  "incomplete_expired",
  "unpaid",
  "paused",
];

const PAYANTS: StatutStripe[] = ["active", "trialing"];

const statut = () => fc.constantFrom(...TOUS_LES_STATUTS);
const cadence = () => fc.constantFrom<CadenceStripe>("month", "year");
/** Des instants plausibles, bornés pour rester lisibles en cas d'échec. */
const instant = () =>
  fc.date({ min: new Date("2020-01-01T00:00:00Z"), max: new Date("2040-01-01T00:00:00Z") });

const rapport = (): fc.Arbitrary<RapportDeStripe> =>
  fc.record({
    statut: statut(),
    cadence: cadence(),
    finDePeriode: instant(),
    resilieALaFin: fc.boolean(),
  });

describe("planDeLaCadence", () => {
  it("associe chaque cadence à son plan", () => {
    expect(planDeLaCadence("month")).toBe("MENSUEL");
    expect(planDeLaCadence("year")).toBe("ANNUEL");
  });
});

describe("etatDepuisStripe", () => {
  it("n'ouvre le plan payant que sur « active » et « trialing »", () => {
    fc.assert(
      fc.property(rapport(), (r) => {
        const paye = etatDepuisStripe(r).plan !== "GRATUIT";

        expect(paye).toBe(PAYANTS.includes(r.statut));
      }),
    );
  });

  it("refuse « past_due » : le renouvellement impayé ne s'offre pas", () => {
    // Stripe avance le terme avant même que la carte ait payé, et relance
    // pendant des semaines. Accorder pendant ce temps offrirait la période.
    const etat = etatDepuisStripe({
      statut: "past_due",
      cadence: "month",
      finDePeriode: new Date("2026-10-01T00:00:00Z"),
      resilieALaFin: false,
    });

    expect(etat.plan).toBe("GRATUIT");
  });

  it("garde le plan jusqu'au terme d'un abonnement résilié", () => {
    // Résilier chez Stripe laisse le statut « active » et lève
    // `cancel_at_period_end` : l'accès court, et c'est la date qui l'arrête.
    const etat = etatDepuisStripe({
      statut: "active",
      cadence: "year",
      finDePeriode: new Date("2027-03-12T00:00:00Z"),
      resilieALaFin: true,
    });

    expect(etat.plan).toBe("ANNUEL");
    expect(etat.resilieALaFin).toBe(true);
  });

  it("recopie le terme et la résiliation sans jamais les interpréter", () => {
    fc.assert(
      fc.property(rapport(), (r) => {
        const etat = etatDepuisStripe(r);

        expect(etat.finDePeriode).toEqual(r.finDePeriode);
        expect(etat.resilieALaFin).toBe(r.resilieALaFin);
      }),
    );
  });

  it("laisse la lecture refuser un terme dépassé, quel que soit le statut", () => {
    // La seconde barrière : même écrit payant, un abonnement dont le terme est
    // passé ne vaut rien. Aucune tâche de fond n'a à l'éteindre.
    fc.assert(
      fc.property(rapport(), instant(), (r, maintenant) => {
        const etat = etatDepuisStripe(r);
        const effectif = planEffectif(
          { plan: etat.plan, finDePeriode: etat.finDePeriode },
          maintenant,
        );

        if (maintenant.getTime() >= etat.finDePeriode.getTime()) {
          expect(effectif).toBe("GRATUIT");
        }
      }),
    );
  });
});

describe("evenementARetenir", () => {
  it("retient le premier événement d'un compte", () => {
    fc.assert(
      fc.property(instant(), (a) => {
        expect(evenementARetenir(null, a)).toBe(true);
      }),
    );
  });

  it("refuse ce qui n'est pas strictement plus récent", () => {
    fc.assert(
      fc.property(instant(), instant(), (dernier, evenement) => {
        expect(evenementARetenir(dernier, evenement)).toBe(evenement.getTime() > dernier.getTime());
      }),
    );
  });

  it("refuse le rejeu d'un événement déjà traité", () => {
    const a = new Date("2026-09-01T12:00:00Z");

    expect(evenementARetenir(a, a)).toBe(false);
  });

  it("refuse une résiliation arrivée après le renouvellement qu'elle précédait", () => {
    // Le cas qui a motivé la borne : deux webhooks partis à une seconde
    // d'écart, arrivés à l'envers. Sans elle, un mois payé disparaît.
    const renouvellement = new Date("2026-09-01T12:00:01Z");
    const resiliation = new Date("2026-09-01T12:00:00Z");

    expect(evenementARetenir(renouvellement, resiliation)).toBe(false);
  });
});

describe("abonnementVivant", () => {
  it("ne tient pour finis que canceled et incomplete_expired", () => {
    const finis = TOUS_LES_STATUTS.filter((statut) => !abonnementVivant(statut));

    expect(finis).toEqual(["canceled", "incomplete_expired"]);
  });

  it("tient past_due pour vivant, alors qu'il n'ouvre aucun droit", () => {
    // Les deux règles ne se recouvrent pas, et c'est tout l'intérêt : une carte
    // qui échoue coupe l'accès sans fermer l'abonnement. Racheter par-dessus
    // ferait deux abonnements dont le premier repartirait à la première relance
    // réussie.
    const impaye: RapportDeStripe = {
      statut: "past_due",
      cadence: "month",
      finDePeriode: new Date("2026-10-01T00:00:00Z"),
      resilieALaFin: false,
    };

    expect(abonnementVivant(impaye.statut)).toBe(true);
    expect(etatDepuisStripe(impaye).plan).toBe("GRATUIT");
  });

  it("laisse racheter après une résiliation effective", () => {
    expect(abonnementVivant("canceled")).toBe(false);
  });

  it("tient pour vivant tout statut qui ouvre un droit", () => {
    fc.assert(
      fc.property(rapport(), (rapport) => {
        if (etatDepuisStripe(rapport).plan === "GRATUIT") return;

        expect(abonnementVivant(rapport.statut)).toBe(true);
      }),
    );
  });
});
