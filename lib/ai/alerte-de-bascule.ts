import type { CleDAlerte } from "@/lib/db/alerte-quota";
import type { AlerteDeBasculePayload } from "@/lib/email/templates/alerte-de-bascule";

/**
 * Prévenir quand le modèle principal tombe trop souvent : le repli sur Sonnet
 * garde les dépôts en marche, mais coûte plus. L'alerte laisse le temps de
 * basculer à la main (`AI_FOURNISSEUR=anthropic`) ou d'attendre. Mêmes règles que
 * `alerte-de-plafond.ts` : erreur avalée, hors chemin critique, une par jour.
 */

/** Bascules du jour au-delà desquelles on alerte. */
export const SEUIL_BASCULES = 5;

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
 * `AlerteQuota` n'a pas de compteur de bascules : on prend `GLOBAL`, et la `cible`
 * évite de mordre sur l'alerte de plafond global (`cible: ""`).
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
