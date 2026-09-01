import type Stripe from "stripe";
import { z } from "zod";
import type { RapportDeStripe } from "@/lib/domain/rapport-de-stripe";
import { RapportIllisibleError } from "./erreurs";

/**
 * Réduire un abonnement Stripe aux quatre champs qui décident d'un droit.
 *
 * L'objet que rend Stripe porte des dizaines de propriétés ; la règle n'en lit
 * que quatre, et elle vit dans `lib/domain/`, hors de portée du SDK. Ce module
 * est la frontière : il valide, il convertit, et il refuse. Après lui, plus
 * personne n'a affaire à Stripe.
 *
 * **Le statut est validé et non transtypé.** Le SDK le déclare avec une
 * échappatoire — l'union se termine par `string` — précisément parce que Stripe
 * peut en ajouter un. Un statut inconnu doit faire échouer la lecture, pas
 * tomber dans une branche par défaut : la seule branche par défaut possible
 * serait « pas payant », et se tromper dans ce sens-là coupe l'accès de
 * quelqu'un qui a payé.
 */

const statutSchema = z.enum([
  "active",
  "trialing",
  "past_due",
  "canceled",
  "incomplete",
  "incomplete_expired",
  "unpaid",
  "paused",
]);

const cadenceSchema = z.enum(["month", "year"]);

/**
 * Le rapport, ou une erreur qui dit ce qui ne se lit pas.
 *
 * Un abonnement Kairn porte exactement une ligne — il n'y a qu'une chose à
 * vendre. Plusieurs lignes voudraient dire que quelqu'un a modifié l'abonnement
 * depuis le tableau de bord Stripe, et il n'existe alors pas de réponse
 * évidente à « quelle est la cadence de ce compte ». On refuse plutôt que de
 * prendre la première et d'espérer.
 */
export function lireLeRapport(abonnement: Stripe.Subscription): RapportDeStripe {
  const lignes = abonnement.items.data;
  const ligne = lignes.length === 1 ? lignes[0] : undefined;

  if (!ligne) {
    throw new RapportIllisibleError(
      `${lignes.length} lignes dans l'abonnement ${abonnement.id}, il en faut exactement une.`,
    );
  }

  const statut = statutSchema.safeParse(abonnement.status);
  const cadence = cadenceSchema.safeParse(ligne.price.recurring?.interval);

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
    // Stripe compte en secondes depuis l'époque, et le terme vit sur la ligne
    // et non sur l'abonnement depuis que la facturation peut être découpée par
    // ligne. La conversion est ici, au bord : tout ce qui est en aval manipule
    // des `Date` comparées en UTC.
    finDePeriode: new Date(ligne.current_period_end * 1000),
    resilieALaFin: abonnement.cancel_at_period_end,
  };
}
