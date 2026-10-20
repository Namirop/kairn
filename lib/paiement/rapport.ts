import type Stripe from "stripe";
import { z } from "zod";
import type { RapportDeStripe } from "@/lib/domain/rapport-de-stripe";
import { RapportIllisibleError } from "./erreurs";

/**
 * La frontière entre le SDK et `lib/domain/`. Statut validé, pas transtypé (le
 * SDK dit `… | string`) : un inconnu doit échouer, pas tomber sur « pas payant »
 * et couper quelqu'un qui a payé.
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

/** Une seule ligne : plusieurs (retouche manuelle chez Stripe) rendraient la cadence ambiguë. */
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
    // En secondes, et sur la ligne, pas sur l'abonnement.
    finDePeriode: new Date(ligne.current_period_end * 1000),
    resilieALaFin: abonnement.cancel_at_period_end,
  };
}
