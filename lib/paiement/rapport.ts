import type Stripe from "stripe";
import { z } from "zod";
import type { RapportDeStripe } from "@/lib/domain/rapport-de-stripe";
import { RapportIllisibleError } from "./erreurs";

/**
 * Réduire un abonnement Stripe aux quatre champs qui décident d'un droit : la
 * frontière entre le SDK et la règle de `lib/domain/`.
 *
 * Le statut est validé et non transtypé : le SDK le type `… | string`, et un
 * statut inconnu doit faire échouer la lecture plutôt que tomber sur « pas
 * payant », qui couperait l'accès de quelqu'un qui a payé.
 */

const schemaDuStatut = z.enum([
  "active",
  "trialing",
  "past_due",
  "canceled",
  "incomplete",
  "incomplete_expired",
  "unpaid",
  "paused",
]);

const schemaDeCadence = z.enum(["month", "year"]);

/**
 * Le rapport, ou une erreur qui dit ce qui ne se lit pas. Un abonnement Kairn
 * porte exactement une ligne ; plusieurs (une retouche à la main chez Stripe)
 * rendraient la cadence ambiguë, donc on refuse.
 */
export function lireLeRapport(abonnement: Stripe.Subscription): RapportDeStripe {
  const lignes = abonnement.items.data;
  const ligne = lignes.length === 1 ? lignes[0] : undefined;

  if (!ligne) {
    throw new RapportIllisibleError(
      `${lignes.length} lignes dans l'abonnement ${abonnement.id}, il en faut exactement une.`,
    );
  }

  const statut = schemaDuStatut.safeParse(abonnement.status);
  const cadence = schemaDeCadence.safeParse(ligne.price.recurring?.interval);

  if (!statut.success) {
    throw new RapportIllisibleError(`statut « ${abonnement.status} » inconnu.`);
  }

  if (!cadence.success) {
    throw new RapportIllisibleError(
      `cadence « ${ligne.price.recurring?.interval ?? "aucune"} » inconnue.`,
    );
  }

  return {
    statut: statut.data,
    cadence: cadence.data,
    // Secondes chez Stripe, et le terme vit sur la ligne, pas sur l'abonnement.
    finDePeriode: new Date(ligne.current_period_end * 1000),
    resilieALaFin: abonnement.cancel_at_period_end,
  };
}
