import type { CleDAlerte } from "@/lib/db/alerte-quota";
import type { AlerteDePaiementPayload } from "@/lib/email/templates/alerte-de-paiement";
import { PaiementError } from "./erreurs";

/**
 * Prévient quand un webhook de paiement échoue : Stripe a encaissé, `Subscription`
 * n'a pas bougé, l'écran affiche « Gratuit ». Stripe relance trois jours puis
 * renonce ; renvoyer la livraison depuis son tableau de bord répare en un clic.
 *
 * - Ne casse jamais le webhook : il doit rendre son 500 pour que Stripe relance.
 * - Hors du chemin critique : Stripe compte le temps de réponse.
 * - Une par jour au plus, sinon 72 emails pour trois jours de relances horaires.
 *
 * Une signature refusée n'arrive pas ici (bruit de scan ou rotation de secret).
 * Collaborateurs reçus, pas importés, pour tester sans base ; câblage dans
 * `signalement-de-webhook.ts`.
 */

/** Distincte des cibles de plafond et de bascule. */
const CIBLE_PAIEMENT = "webhook-paiement";

export type EchecDeWebhook = {
  /** Le type d'événement Stripe, ou `null` si le corps n'a pas été lu jusque-là. */
  type: string | null;
  erreur: unknown;
};

export type OutilsDAlerteDePaiement = {
  reserver: (cle: CleDAlerte, maintenant: Date) => Promise<boolean>;
  envoyer: (payload: AlerteDePaiementPayload) => Promise<void>;
};

/** Distingue « Stripe a changé de forme » d'« une variable manque ». */
export function codeDeLEchec(erreur: unknown): string {
  return erreur instanceof PaiementError ? erreur.code : "INCONNU";
}

/** Une ligne lisible dans un email. */
export function motifDeLEchec(erreur: unknown): string {
  if (erreur instanceof Error) return `${erreur.name} : ${erreur.message}`;

  return String(erreur);
}

export async function signalerLEchecDuWebhook(
  echec: EchecDeWebhook,
  maintenant: Date,
  outils: OutilsDAlerteDePaiement,
): Promise<void> {
  try {
    const pris = await outils.reserver(
      // Le seuil est dans la clé primaire d'`AlerteQuota` : à zéro, une par jour.
      { compteur: "GLOBAL", cible: CIBLE_PAIEMENT, seuil: 0 },
      maintenant,
    );

    if (!pris) return;

    await outils.envoyer({
      type: echec.type ?? "inconnu",
      code: codeDeLEchec(echec.erreur),
      motif: motifDeLEchec(echec.erreur),
      instant: maintenant,
    });
  } catch (erreur) {
    console.error("[paiement] alerte de webhook non envoyée", erreur);
  }
}
