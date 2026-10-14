import type { CleDAlerte } from "@/lib/db/alerte-quota";
import type { AlerteDePaiementPayload } from "@/lib/email/templates/alerte-de-paiement";
import { PaiementError } from "./erreurs";

/**
 * Prévenir quand un webhook de paiement n'aboutit pas.
 *
 * La seule panne qui coûte de l'argent à quelqu'un : Stripe a encaissé, la
 * ligne `Subscription` n'a pas bougé, et l'écran affiche « Gratuit » sans
 * raison d'écrire. Stripe relance trois jours puis renonce ; la réparation
 * (renvoyer la livraison depuis le tableau de bord Stripe) tient en un clic,
 * encore faut-il le savoir.
 *
 * Mêmes règles que les autres alertes d'exploitation :
 * 1. Elle ne casse jamais ce qu'elle surveille : toute erreur est journalisée et
 *    avalée, le webhook doit rendre son 500 à Stripe pour qu'il relance.
 * 2. Hors du chemin critique : Stripe compte le temps de réponse de l'endpoint.
 * 3. Une par jour au plus — sinon trois jours de relances horaires feraient
 *    soixante-douze emails pour une panne.
 *
 * La signature refusée n'arrive pas ici : c'est du bruit (scan, rotation de
 * secret), écarté dans le route handler.
 *
 * Les collaborateurs sont reçus, jamais importés : le fichier se teste sans base
 * ni réseau. Le câblage vit dans `signalement-de-webhook.ts`.
 */

/** Sert de `cible` dans la clé d'alerte — distincte des cibles de plafond et de bascule. */
const CIBLE_PAIEMENT = "webhook-paiement";

/** Ce qu'on sait de l'échec au moment de le signaler. */
export type EchecDeWebhook = {
  /** Le type d'événement Stripe, ou `null` si le corps n'a pas été lu jusque-là. */
  type: string | null;
  erreur: unknown;
};

export type OutilsDAlerteDePaiement = {
  reserver: (cle: CleDAlerte, maintenant: Date) => Promise<boolean>;
  envoyer: (payload: AlerteDePaiementPayload) => Promise<void>;
};

/**
 * Le code de l'échec, quand le produit en a posé un.
 *
 * `PaiementError` en porte un stable, qui distingue « Stripe a changé de
 * forme » de « une variable manque ». Le reste passe par le motif.
 */
export function codeDeLEchec(erreur: unknown): string {
  return erreur instanceof PaiementError ? erreur.code : "INCONNU";
}

/** Ce que l'erreur raconte, réduit à une ligne lisible dans un email. */
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
      // Pas de palier ici : le seuil fait partie de la clé primaire
      // d'`AlerteQuota` et reste à zéro, ce qui donne « une par jour ».
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
