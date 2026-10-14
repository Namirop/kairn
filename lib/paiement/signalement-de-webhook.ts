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
 * `alerte-de-webhook.ts` ne connaît que des types et se teste sans base ni
 * emails ; ce qui touche au monde réel est ici.
 */

const OUTILS: OutilsDAlerteDePaiement = {
  reserver: reserverLAlerte,
  envoyer: envoyerLAlerteDePaiement,
};

/**
 * Signale l'échec sans faire attendre Stripe, qui coupe les endpoints lents :
 * le 500 part tout de suite, l'email suit après la réponse.
 */
export function signalerLePaiementEnEchec(echec: EchecDeWebhook, maintenant = new Date()): void {
  differer(() => signalerLEchecDuWebhook(echec, maintenant, OUTILS));
}
