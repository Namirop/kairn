import type { CleDAlerte } from "@/lib/db/alerte-quota";
import type { AlerteDeBasculePayload } from "@/lib/email/templates/alerte-de-bascule";

/**
 * Prévenir quand Luna tombe trop souvent.
 *
 * Le repli sur Sonnet fait que les dépôts continuent de partir, mais si Luna
 * tombe cinq fois par jour, ce n'est plus un accident isolé — c'est un
 * fournisseur qui coûte plus que ce qu'il économise. L'alerte laisse le temps
 * de choisir : basculer manuellement `AI_FOURNISSEUR=anthropic` le temps de
 * regarder, ou attendre que ça se stabilise.
 *
 * Mêmes trois règles que la surveillance des plafonds :
 * 1. **Ne casse jamais ce qu'elle surveille** — toute erreur est journalisée
 *    et avalée. Une alerte perdue coûte infiniment moins qu'un dépôt perdu.
 * 2. **Attend son tour** — hors du chemin critique, la bascule vient de se
 *    faire, on ne fait pas attendre la réponse pour un email.
 * 3. **Parle une fois** — une alerte par jour au maximum, `AlerteQuota` s'en
 *    charge (voir `reserverLAlerte`).
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
 * Le `compteur` de la clé d'alerte est `GLOBAL` — l'infra `AlerteQuota` n'a
 * pas d'enum dédié aux bascules, et la sémantique (« ceci vaut pour le
 * produit entier ») s'aligne quand même. La `cible` distingue : `bascules-luna`
 * ne mordra jamais sur une alerte de plafond global (qui a `cible: ""`).
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
