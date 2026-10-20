import { reserverLAlerte } from "@/lib/db/alerte-quota";
import { envoyerLAlerteDePaiement } from "@/lib/email/alerte-de-paiement";
import { differer } from "@/lib/hors-chemin-critique";
import {
  signalerLEchecDuWebhook,
  type EchecDeWebhook,
  type OutilsDAlerteDePaiement,
} from "./alerte-de-webhook";

/** Le câblage réel, pour que `alerte-de-webhook.ts` se teste sans base ni emails. */

const OUTILS: OutilsDAlerteDePaiement = {
  reserver: reserverLAlerte,
  envoyer: envoyerLAlerteDePaiement,
};

/** Stripe coupe les endpoints lents : le 500 part tout de suite, l'email après. */
export function signalerLePaiementEnEchec(echec: EchecDeWebhook, maintenant = new Date()): void {
  differer(() => signalerLEchecDuWebhook(echec, maintenant, OUTILS));
}
