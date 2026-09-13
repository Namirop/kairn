import { reserverLAlerte } from "@/lib/db/alerte-quota";
import { envoyerLAlerteDePaiement } from "@/lib/email/alerte-de-paiement";
import { differer } from "@/lib/hors-chemin-critique";
import {
  signalerLEchecDuWebhook,
  type EchecDeWebhook,
  type OutilsDAlerteDePaiement,
} from "./alerte-de-webhook";

/**
 * Le câblage de l'alerte de paiement : la base, les emails, l'attente.
 *
 * Séparé de la décision pour la même raison que la surveillance des plafonds :
 * `alerte-de-webhook.ts` ne connaît que des types, donc il se charge et se teste
 * sans client de base ni client d'emails. Tout ce qui touche au monde réel est
 * ici, dans un fichier qui n'a aucune logique à vérifier.
 */

const OUTILS: OutilsDAlerteDePaiement = {
  reserver: reserverLAlerte,
  envoyer: envoyerLAlerteDePaiement,
};

/**
 * Signale l'échec sans faire attendre Stripe.
 *
 * Stripe mesure le temps de réponse d'un endpoint et coupe ceux qui traînent :
 * le 500 doit partir tout de suite, pour que la relance commence. L'email suit
 * après la réponse.
 */
export function signalerLePaiementEnEchec(echec: EchecDeWebhook, maintenant = new Date()): void {
  differer(() => signalerLEchecDuWebhook(echec, maintenant, OUTILS));
}
