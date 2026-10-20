import type { CleDAlerte } from "@/lib/db/alerte-quota";
import type { CompteurDeQuota } from "@/lib/db/types";
import type { AlerteDePlafondPayload } from "@/lib/email/templates/alerte-de-plafond";
import { seuilAtteint } from "@/lib/domain/seuil-de-plafond";
import { variableDuPlafond } from "./config";

/**
 * Prévenir qu'un plafond d'appels approche, avant que des dépôts échouent en silence.
 * - Ne jamais casser ce qu'on surveille : toute erreur est journalisée et avalée.
 * - Hors du chemin critique : le dépôt n'attend pas d'email, aucun verrou sur le compteur.
 * - Une alerte par seuil, compteur et jour, sinon chaque appel suivant enverrait un email.
 *
 * Les collaborateurs sont reçus pour se tester en doublures ; le câblage réel
 * vit dans `signalement-de-plafond.ts`.
 */

export type EtatDuCompteur = {
  compteur: CompteurDeQuota;
  /** Le compte, pour le compteur par compte ; nul pour les deux autres. */
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
 * Ne lève jamais : appelée depuis le chemin d'un dépôt. Le verrou se prend avant
 * l'envoi : après, deux réservations simultanées enverraient chacune, et une panne
 * de Resend réessaierait à chaque appel. Mieux vaut perdre une alerte qu'une rafale.
 */
export async function surveillerLePlafond(
  etat: EtatDuCompteur,
  maintenant: Date,
  outils: OutilsDAlerte,
): Promise<void> {
  try {
    const seuil = seuilAtteint(etat.utilisees, etat.plafond);

    if (seuil === null) return;

    // "" et non `null`, refusé dans une clé primaire Postgres. La cible distingue
    // les comptes : sinon le premier au seuil consommerait l'alerte des autres.
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
    // `error` : une alerte perdue est silencieuse, c'est le journal qui doit crier.
    console.error(
      `[plafond] alerte ${etat.compteur} non envoyée (${etat.utilisees}/${etat.plafond})`,
      erreur,
    );
  }
}
