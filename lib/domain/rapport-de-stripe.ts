import type { Plan } from "@/lib/domain/plafond-du-plan";

/**
 * Traduire ce que Stripe raconte en droits Kairn.
 *
 * C'est le seul endroit qui décide qu'un abonnement ouvre le plan payant. Le
 * webhook reçoit et écrit, `plafond-du-plan.ts` lit et applique ; entre les
 * deux, cette fonction est la règle — pure, donc éprouvable sans base ni
 * réseau, ce qu'un webhook ne sera jamais.
 *
 * Elle ne connaît pas le SDK Stripe. Ce qu'elle prend est un rapport déjà
 * validé, réduit aux quatre champs qui décident : le reste de l'objet Stripe
 * compte des dizaines de propriétés dont aucune ne change un droit.
 */

/**
 * Les statuts d'abonnement de Stripe, tous listés.
 *
 * Ils sont écrits ici plutôt qu'importés du SDK pour la même raison que `Plan`
 * est redéclaré au lieu d'être tiré de Prisma : `lib/domain/` ne dépend de rien.
 * La liste est fermée, donc un statut inventé ne compile pas — et un statut que
 * Stripe ajouterait un jour sera refusé au parsing, ce qui est bruyant, plutôt
 * qu'assimilé à « actif », ce qui serait un abonnement offert.
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
 * Ce que Stripe dit d'un abonnement, réduit à ce qui décide.
 *
 * `finDePeriode` est un instant. Stripe le donne en secondes depuis l'époque ;
 * la conversion se fait au bord, et tout ce qui est en aval manipule des `Date`
 * comparées en UTC, comme partout dans ce projet.
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
 * Les deux seuls statuts qui ouvrent le plan payant.
 *
 * Le choix se joue sur `past_due`, et il est délibéré. Quand un renouvellement
 * échoue, Stripe avance quand même le terme de l'abonnement et relance la carte
 * pendant des semaines : accorder le plan pendant ce temps offrirait un mois
 * entier à qui n'a rien payé. Le refuser rend la période impayée gratuite tout
 * de suite, ce qui est exactement ce qu'elle est.
 *
 * `trialing` est ici alors qu'aucune offre n'a d'essai aujourd'hui. C'est un
 * statut que Stripe produit dès qu'on en ouvre un, y compris depuis son
 * interface, sans que le code change : l'oublier ferait qu'un essai accordé à
 * la main n'ouvrirait rien.
 */
const STATUTS_PAYANTS: readonly StatutStripe[] = ["active", "trialing"];

/** Le plan qu'ouvre une cadence. Les deux ouvrent le même plafond. */
export function planDeLaCadence(cadence: CadenceStripe): Plan {
  return cadence === "month" ? "MENSUEL" : "ANNUEL";
}

/**
 * Les deux seuls statuts dont on ne revient pas.
 *
 * Un abonnement `canceled` ou `incomplete_expired` est fini : il ne facturera
 * plus rien et ne peut pas être repris. Tous les autres sont vivants, y compris
 * ceux qui n'ouvrent aucun droit — `past_due` relance la carte pendant des
 * semaines, `paused` reprendra, `incomplete` attend une authentification.
 */
const STATUTS_TERMINAUX: readonly StatutStripe[] = ["canceled", "incomplete_expired"];

/**
 * Cet abonnement peut-il encore facturer ?
 *
 * **La question n'est pas « ouvre-t-il un droit ».** Ce sont deux règles
 * distinctes et il ne faut pas les confondre : un abonnement `past_due` ne donne
 * accès à rien — `etatDepuisStripe` le refuse — mais il existe toujours chez
 * Stripe, il relance la carte, et il facturera dès qu'un paiement passe.
 *
 * Elle sert à interdire un second achat. Quelqu'un qui a déjà un abonnement
 * vivant et qui repaie se retrouve avec deux abonnements pour un seul compte,
 * donc deux prélèvements par mois — et notre ligne, qui n'en retient qu'un, rend
 * le premier invisible. C'est le genre de doublon qu'on ne découvre qu'à la
 * réclamation, parce qu'aucun des deux paiements n'échoue.
 */
export function abonnementVivant(statut: StatutStripe): boolean {
  return !STATUTS_TERMINAUX.includes(statut);
}

/**
 * L'état à écrire, d'après ce que Stripe rapporte.
 *
 * **Le terme est recopié même quand le plan retombe à gratuit.** La ligne dit
 * ce que Stripe dit, sans interprétation : c'est `planEffectif()` qui arbitre à
 * la lecture, et lui refuse déjà tout plan gratuit quelle que soit sa date. Une
 * ligne qui garde le terme reste lisible en exploitation — « résilié le 12,
 * terme au 30 » se raconte, un champ vidé ne raconte rien.
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
 * Stripe ne garantit pas l'ordre d'arrivée de ses webhooks et les rejoue en cas
 * d'échec. Deux événements partis à une seconde d'intervalle peuvent donc
 * arriver à l'envers, et le plus ancien écraserait le plus récent — un
 * renouvellement effacé par la résiliation qui l'a précédé, et un mois payé
 * perdu sans un bruit.
 *
 * La borne est stricte : à instant égal, on n'écrit pas. Deux événements
 * portant la même seconde disent la même chose de l'abonnement — les rejouer
 * n'apprendrait rien, et le second serait tout aussi bien le premier arrivé
 * deux fois.
 */
export function evenementARetenir(dernierTraiteA: Date | null, evenementA: Date): boolean {
  if (dernierTraiteA === null) return true;

  return evenementA.getTime() > dernierTraiteA.getTime();
}
