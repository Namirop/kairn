import type { CleDAlerte } from "@/lib/db/alerte-quota";
import type { AlerteDeBasculePayload } from "@/lib/email/templates/alerte-de-bascule";

/**
 * Prévenir quand le modèle principal tombe trop souvent.
 *
 * Le repli sur Sonnet garde les dépôts en marche, mais des bascules répétées
 * font un fournisseur qui coûte plus qu'il n'économise. L'alerte laisse le
 * temps de basculer manuellement (`AI_FOURNISSEUR=anthropic`) ou d'attendre.
 *
 * Mêmes règles que la surveillance des plafonds : toute erreur est journalisée
 * et avalée (une alerte perdue coûte moins qu'un dépôt perdu), l'envoi se fait
 * hors du chemin critique, et une alerte par jour au plus (`reserverLAlerte`).
 */

/** Le seuil de bascules dans la journée au-delà duquel on alerte. */
export const SEUIL_BASCULES = 5;

/** Sert de `cible` dans la clé d'alerte — distincte des cibles de plafond. */
const CIBLE_BASCULE = "bascules-luna";

export type EtatDesBascules = {
  bascules: number;
  seuil: number;
  motifDernier: string;
};

export type OutilsDAlerteBascule = {
  reserver: (cle: CleDAlerte, maintenant: Date) => Promise<boolean>;
  envoyer: (payload: AlerteDeBasculePayload) => Promise<void>;
};

/**
 * Regarde le compte des bascules du jour, alerte si le seuil est dépassé.
 *
 * `AlerteQuota` n'a pas de compteur dédié aux bascules : on prend `GLOBAL`, et
 * c'est la `cible` qui évite de mordre sur l'alerte de plafond global
 * (`cible: ""`).
 */
export async function surveillerLesBascules(
  etat: EtatDesBascules,
  maintenant: Date,
  outils: OutilsDAlerteBascule,
): Promise<void> {
  try {
    if (etat.bascules <= etat.seuil) return;

    const pris = await outils.reserver(
      { compteur: "GLOBAL", cible: CIBLE_BASCULE, seuil: etat.seuil },
      maintenant,
    );

    if (!pris) return;

    await outils.envoyer({
      bascules: etat.bascules,
      seuil: etat.seuil,
      motif: etat.motifDernier,
      instant: maintenant,
    });
  } catch (erreur) {
    console.error(`[bascule] alerte non envoyée (${etat.bascules}/${etat.seuil})`, erreur);
  }
}
