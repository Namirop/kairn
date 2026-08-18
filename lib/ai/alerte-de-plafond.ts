import type { CleDAlerte } from "@/lib/db/alerte-quota";
import type { CompteurDeQuota } from "@/lib/db/types";
import type { AlerteDePlafondPayload } from "@/lib/email/templates/alerte-de-plafond";
import { seuilAtteint } from "@/lib/domain/seuil-de-plafond";
import { variableDuPlafond } from "./config";

/**
 * Prévenir avant que ça bloque.
 *
 * Aujourd'hui un plafond atteint fait échouer des dépôts et personne n'est au
 * courant : on l'apprend si quelqu'un écrit. C'est le vrai défaut — pas la
 * valeur des plafonds, qu'on ne peut de toute façon pas régler sans avoir
 * observé un pic.
 *
 * Trois règles gouvernent ce fichier, dans cet ordre :
 *
 * 1. **Il ne casse jamais ce qu'il surveille.** Toute erreur est journalisée et
 *    avalée. Un Resend en panne ne fait pas échouer une extraction, et une
 *    alerte perdue coûte infiniment moins qu'un dépôt perdu.
 * 2. **Il attend son tour.** Le travail sort du chemin critique : le dépôt ne
 *    patiente pas derrière un email, et rien de tout ceci ne tient un verrou sur
 *    le compteur qu'on vient d'incrémenter.
 * 3. **Il ne parle qu'une fois.** Une alerte par seuil, par compteur et par
 *    jour. Sans ça, un plafond franchi au trente-cinquième appel enverrait un
 *    email à chaque appel suivant.
 *
 * **Les collaborateurs sont reçus, jamais importés**, et c'est ce qui rend
 * l'enchaînement vérifiable : les deux comportements qui peuvent mal tourner en
 * silence — le doublon et l'erreur avalée — se testent avec des doublures, sans
 * base ni réseau. Le câblage réel vit dans `signalement-de-plafond.ts` ; ce
 * fichier-ci ne connaît que des types, et il ne charge donc ni client de base ni
 * client d'emails.
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
 * Regarde où en est le compteur, et prévient si un seuil est atteint.
 *
 * **Cette fonction ne lève jamais.** C'est sa raison d'être : elle est appelée
 * depuis le chemin d'un dépôt, et la seule chose qu'elle a le droit de faire en
 * cas de problème est de l'écrire dans les journaux.
 *
 * Le verrou est pris **avant** l'envoi et non après. L'ordre inverse serait plus
 * juste — on ne noterait comme envoyée qu'une alerte réellement partie — mais il
 * rouvre la fenêtre entre deux réservations simultanées, et surtout il ferait
 * réessayer à chaque appel tant que Resend est en panne : quinze tentatives dans
 * l'heure au lieu d'une. On préfère perdre une alerte le jour où le fournisseur
 * est à terre plutôt que de risquer la rafale qu'on est venu empêcher.
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
    // de valeur nulle, et sans distinction par compte le premier à franchir un
    // seuil aurait consommé l'alerte de tous les autres pour la journée.
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
    // Le contexte, pas le contenu : un identifiant de compte, jamais de texte
    // déposé. Et `error` et non `warn` — une alerte qui ne part pas est
    // silencieuse par construction, c'est le journal qui doit crier.
    console.error(
      `[plafond] alerte ${etat.compteur} non envoyée (${etat.utilisees}/${etat.plafond})`,
      erreur,
    );
  }
}
