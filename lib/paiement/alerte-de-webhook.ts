import type { CleDAlerte } from "@/lib/db/alerte-quota";
import type { AlerteDePaiementPayload } from "@/lib/email/templates/alerte-de-paiement";
import { PaiementError } from "./erreurs";

/**
 * Prévenir quand un webhook de paiement n'aboutit pas.
 *
 * **C'est la seule panne du produit qui coûte de l'argent à quelqu'un
 * d'autre.** Tout le reste se rattrape : un dépôt qui échoue se redépose, un
 * rappel manqué revient le lendemain. Ici, Stripe a encaissé et la ligne
 * `Subscription` n'a pas bougé — le compte reste gratuit alors qu'il est payé,
 * et la personne n'a aucune raison de penser à écrire : son écran affiche
 * « Gratuit », ce qui ressemble à un paiement perdu et non à une panne de notre
 * côté.
 *
 * Le seul signe existant était une ligne de journal chez l'hébergeur, que
 * personne n'ouvre spontanément. Stripe relance pendant trois jours puis
 * renonce ; passé ce délai, plus rien ne rappelle qu'il s'est passé quelque
 * chose. La réparation, elle, tient en un clic — le tableau de bord Stripe
 * garde chaque livraison et sait la renvoyer —, encore faut-il savoir qu'il y a
 * quelque chose à réparer.
 *
 * Cette alerte vient de la lecture de DevisRapide, où le même chemin appelle
 * `reportIncident` sur chaque cas d'argent encaissé sans contrepartie. Le canal
 * diffère — Kairn alerte par email, pas par heartbeat — mais la règle est la
 * même : ce qui ne se rattrape pas tout seul doit réveiller quelqu'un.
 *
 * Mêmes trois règles que les autres alertes d'exploitation du produit :
 *
 * 1. **Elle ne casse jamais ce qu'elle surveille.** Toute erreur est journalisée
 *    et avalée. Le webhook doit rendre son 500 à Stripe pour qu'il relance, quoi
 *    qu'il arrive à Resend.
 * 2. **Elle attend son tour.** Hors du chemin critique : Stripe compte le temps
 *    de réponse d'un endpoint, et le nôtre n'a pas à porter un envoi d'email.
 * 3. **Elle ne parle qu'une fois.** Une par jour au maximum — sans quoi une
 *    relance toutes les heures pendant trois jours ferait soixante-douze emails
 *    pour une seule panne.
 *
 * **La signature refusée n'en est pas une.** C'est du bruit : un scan sur une
 * route publique, ou une relance pendant une rotation de secret. Elle est
 * écartée avant d'arriver ici — voir le route handler.
 *
 * **Les collaborateurs sont reçus, jamais importés**, comme dans
 * `alerte-de-plafond.ts` : ce fichier ne connaît que des types, il se teste sans
 * base ni réseau. Le câblage vit dans `signalement-de-webhook.ts`.
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
 * `PaiementError` en porte un stable — `PAIEMENT_RAPPORT_ILLISIBLE`,
 * `PAIEMENT_CONFIG` — et c'est ce qui distingue « Stripe a changé de forme » de
 * « une variable manque ». Tout le reste est une panne quelconque, et le motif
 * dira ce qu'elle raconte.
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
      // Le seuil ne mesure rien ici — il n'y a pas de palier, il y a une panne.
      // Il fait partie de la clé primaire de `AlerteQuota`, donc il vaut zéro et
      // ne bouge pas : c'est ce qui donne « une par jour ».
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
