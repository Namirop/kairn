import type { Plan } from "@/lib/domain/plafond-du-plan";

/**
 * Traduire ce que Stripe raconte en droits Kairn : le seul endroit qui décide
 * qu'un abonnement ouvre le plan payant. Le webhook écrit, `plafond-du-plan.ts`
 * applique. Elle prend un rapport déjà validé, réduit aux champs qui décident.
 */

/**
 * Les statuts d'abonnement de Stripe, recopiés pour que `lib/domain/` ne dépende
 * pas du SDK. La liste est fermée : un statut nouveau chez Stripe est refusé au
 * parsing plutôt qu'assimilé à « actif », ce qui offrirait un abonnement.
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

/**
 * Ce que Stripe dit d'un abonnement, réduit à ce qui décide. `finDePeriode`
 * arrive en secondes depuis l'époque et est converti en `Date` au bord.
 */
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
 * Les seuls statuts qui ouvrent le plan payant.
 *
 * `past_due` en est exclu exprès : après un renouvellement échoué, Stripe
 * avance le terme et relance la carte pendant des semaines, ce qui offrirait un
 * mois à qui n'a rien payé. `trialing` est inclus bien qu'aucune offre n'ait
 * d'essai : un essai accordé à la main depuis Stripe doit ouvrir le plan.
 */
const STATUTS_PAYANTS: readonly StatutStripe[] = ["active", "trialing"];

/** Le plan qu'ouvre une cadence. Les deux ouvrent le même plafond. */
export function planDeLaCadence(cadence: CadenceStripe): Plan {
  return cadence === "month" ? "MENSUEL" : "ANNUEL";
}

/**
 * Les seuls statuts dont on ne revient pas. Tous les autres sont vivants, même
 * sans droit : `past_due` relance la carte, `paused` reprendra, `incomplete`
 * attend une authentification.
 */
const STATUTS_TERMINAUX: readonly StatutStripe[] = ["canceled", "incomplete_expired"];

/**
 * Cet abonnement peut-il encore facturer ? À ne pas confondre avec « ouvre-t-il
 * un droit » : un `past_due` n'ouvre rien mais facturera dès qu'un paiement
 * passe.
 *
 * Sert à interdire un second achat : deux abonnements vivants feraient deux
 * prélèvements, et notre ligne n'en retient qu'un.
 */
export function abonnementVivant(statut: StatutStripe): boolean {
  return !STATUTS_TERMINAUX.includes(statut);
}

/**
 * L'état à écrire, d'après ce que Stripe rapporte.
 *
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
 * Cet événement a-t-il encore quelque chose à apprendre à la ligne ?
 *
 * Stripe ne garantit pas l'ordre de ses webhooks et les rejoue : sans ce test,
 * une résiliation arrivée en retard effacerait le renouvellement qui l'a suivie.
 * La borne est stricte : à instant égal, l'événement n'apprend rien de plus.
 */
export function evenementARetenir(dernierTraiteA: Date | null, evenementA: Date): boolean {
  if (dernierTraiteA === null) return true;

  return evenementA.getTime() > dernierTraiteA.getTime();
}
