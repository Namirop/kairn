import type { CleDAlerte } from "@/lib/db/alerte-quota";
import type { CompteurDeQuota } from "@/lib/db/types";
import type { AlerteDePlafondPayload } from "@/lib/email/templates/alerte-de-plafond";
import { seuilAtteint } from "@/lib/domain/seuil-de-plafond";
import { variableDuPlafond } from "./config";

/**
 * Prévenir quand un plafond d'appels au modèle approche, avant que des dépôts
 * échouent sans que personne le sache.
 *
 * Trois règles, dans cet ordre :
 * 1. Ne jamais casser ce qu'on surveille : toute erreur est journalisée et
 *    avalée. Une alerte perdue coûte moins qu'un dépôt perdu.
 * 2. Rester hors du chemin critique : le dépôt n'attend pas un email, et rien ne
 *    tient de verrou sur le compteur qu'on vient d'incrémenter.
 * 3. Ne parler qu'une fois : une alerte par seuil, par compteur et par jour,
 *    sinon chaque appel au-delà du seuil enverrait un email.
 *
 * Les collaborateurs sont reçus, jamais importés : le doublon et l'erreur
 * avalée se testent avec des doublures. Le câblage réel vit dans
 * `signalement-de-plafond.ts`.
 */

/** Ce qu'une réservation vient de constater sur son compteur. */
export type EtatDuCompteur = {
  compteur: CompteurDeQuota;
  /** Le compte concerné, pour le compteur par compte. Nul pour les deux autres. */
  cible: string | null;
  utilisees: number;
  plafond: number;
};

export type OutilsDAlerte = {
  reserver: (cle: CleDAlerte, maintenant: Date) => Promise<boolean>;
  depenseDuJourUsd: (maintenant: Date) => Promise<string>;
  envoyer: (payload: AlerteDePlafondPayload) => Promise<void>;
};

const VARIABLE_DU_COMPTEUR: Record<CompteurDeQuota, string> = {
  GLOBAL: variableDuPlafond("dailyCallCap"),
  COMPTE: variableDuPlafond("userDailyCallCap"),
  ANONYME: variableDuPlafond("anonymousDailyCallCap"),
};

/**
 * Prévient si le compteur atteint un seuil. Ne lève jamais : elle est appelée
 * depuis le chemin d'un dépôt.
 *
 * Le verrou est pris avant l'envoi, pas après : l'ordre inverse rouvrirait la
 * fenêtre entre deux réservations simultanées et réessaierait à chaque appel
 * tant que Resend est en panne. On préfère perdre une alerte que d'envoyer la
 * rafale qu'on est venu empêcher.
 */
export async function surveillerLePlafond(
  etat: EtatDuCompteur,
  maintenant: Date,
  outils: OutilsDAlerte,
): Promise<void> {
  try {
    const seuil = seuilAtteint(etat.utilisees, etat.plafond);

    if (seuil === null) return;

    // La chaîne vide et non `null` : une clé primaire de Postgres n'accepte pas
    // de valeur nulle. La cible distingue les comptes, sinon le premier à
    // franchir un seuil consommerait l'alerte de tous les autres.
    const pris = await outils.reserver(
      { compteur: etat.compteur, cible: etat.cible ?? "", seuil },
      maintenant,
    );

    if (!pris) return;

    await outils.envoyer({
      compteur: etat.compteur,
      cible: etat.cible,
      seuil,
      utilisees: etat.utilisees,
      plafond: etat.plafond,
      variable: VARIABLE_DU_COMPTEUR[etat.compteur],
      depenseDuJourUsd: await outils.depenseDuJourUsd(maintenant),
      instant: maintenant,
    });
  } catch (erreur) {
    // `error` et non `warn` : une alerte qui ne part pas est silencieuse par
    // construction, c'est le journal qui doit crier.
    console.error(
      `[plafond] alerte ${etat.compteur} non envoyée (${etat.utilisees}/${etat.plafond})`,
      erreur,
    );
  }
}
