import type { Plan } from "@/lib/domain/plafond-du-plan";

/**
 * Traduire ce que Stripe raconte en droits Kairn : le seul endroit qui décide
 * qu'un abonnement ouvre le plan payant. Le webhook écrit, `plafond-du-plan.ts`
 * applique. Elle prend un rapport déjà validé, réduit aux champs qui décident.
 */

/**
 * Recopiés pour que `lib/domain/` ne dépende pas du SDK. Liste fermée : un
 * statut nouveau est refusé au parsing plutôt qu'assimilé à « actif ».
 */
export type StatutStripe =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "unpaid"
  | "paused";

/** La cadence de facturation, telle que Stripe nomme l'intervalle d'un prix. */
export type CadenceStripe = "month" | "year";

/** `finDePeriode` arrive en secondes depuis l'époque, converti en `Date` au bord. */
export type RapportDeStripe = {
  statut: StatutStripe;
  cadence: CadenceStripe;
  finDePeriode: Date;
  resilieALaFin: boolean;
};

/** Ce qu'on écrit dans `Subscription` à la suite d'un rapport. */
export type EtatDAbonnement = {
  plan: Plan;
  finDePeriode: Date;
  resilieALaFin: boolean;
};

/**
 * Sans `past_due` : après un échec, Stripe avance le terme et relance la carte
 * des semaines, ce qui offrirait un mois. `trialing` couvre un essai accordé à
 * la main, aucune offre n'en ayant.
 */
const STATUTS_PAYANTS: readonly StatutStripe[] = ["active", "trialing"];

/** Le plan qu'ouvre une cadence. Les deux ouvrent le même plafond. */
export function planDeLaCadence(cadence: CadenceStripe): Plan {
  return cadence === "month" ? "MENSUEL" : "ANNUEL";
}

/**
 * Les seuls statuts dont on ne revient pas. `past_due`, `paused` et `incomplete`
 * restent vivants, même sans droit.
 */
const STATUTS_TERMINAUX: readonly StatutStripe[] = ["canceled", "incomplete_expired"];

/**
 * Peut-il encore facturer, ce qui n'est pas ouvrir un droit. Interdit un second
 * achat : deux abonnements vivants feraient deux prélèvements pour une ligne.
 */
export function abonnementVivant(statut: StatutStripe): boolean {
  return !STATUTS_TERMINAUX.includes(statut);
}

/**
 * Le terme est recopié même quand le plan retombe à gratuit : `planEffectif()`
 * arbitre à la lecture, et la ligne reste lisible en exploitation.
 */
export function etatDepuisStripe(rapport: RapportDeStripe): EtatDAbonnement {
  return {
    plan: STATUTS_PAYANTS.includes(rapport.statut) ? planDeLaCadence(rapport.cadence) : "GRATUIT",
    finDePeriode: rapport.finDePeriode,
    resilieALaFin: rapport.resilieALaFin,
  };
}

/**
 * Stripe ne garantit pas l'ordre de ses webhooks et les rejoue : sans ce test,
 * une résiliation en retard effacerait le renouvellement qui l'a suivie.
 */
export function evenementARetenir(dernierTraiteA: Date | null, evenementA: Date): boolean {
  if (dernierTraiteA === null) return true;

  return evenementA.getTime() > dernierTraiteA.getTime();
}
