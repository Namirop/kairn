/**
 * Ce qu'un appel coûte, selon deux conventions qui ne disent pas la même chose.
 *
 * Le registre `AiCall` enregistre le coût au **tarif catalogue**, et c'est
 * volontaire : surestimer la dépense est le bon sens de l'erreur pour un
 * garde-fou de budget. Mais un tableau de bord qui n'affiche que ce chiffre ment
 * dans l'autre sens — il annonce une facture qu'on ne paie pas.
 *
 * D'où deux conventions, montrées côte à côte et nommées :
 *
 * - **catalogue** — le tarif public, celui qui est écrit dans `AiCall`.
 * - **réel** — ce qui est effectivement facturé aujourd'hui, remises
 *   d'introduction comprises.
 *
 * Les deux se rejoindront quand les remises expireront ; c'est justement ce
 * jour-là qu'on veut avoir vu venir la marche.
 */

/** Dollars par million de tokens. */
export type Tarif = {
  entreePerMillion: number;
  sortiePerMillion: number;
};

/** Le tarif public. C'est celui qui sert à écrire `AiCall.costUsd`. */
export const CATALOGUE: Record<string, Tarif> = {
  "claude-opus-5": { entreePerMillion: 5, sortiePerMillion: 25 },
  "claude-sonnet-5": { entreePerMillion: 3, sortiePerMillion: 15 },
  "claude-haiku-4-5": { entreePerMillion: 1, sortiePerMillion: 5 },
  // Retenu à la campagne 1+2 comme finaliste des deux tâches (extraction et
  // génération) — l'identifiant OpenRouter est `openai/gpt-5.6-luna`, mais le
  // catalogue indexe le modèle sur son slug court, tel qu'`AI_MODEL` le porte
  // (côté OpenRouter, on passe l'identifiant complet). Les deux clés
  // renvoient au même tarif ; garder les deux évite de deviner qui appelle.
  "gpt-5.6-luna": { entreePerMillion: 0.2, sortiePerMillion: 1.2 },
  "openai/gpt-5.6-luna": { entreePerMillion: 0.2, sortiePerMillion: 1.2 },
  // Le modèle du repli, routé par OpenRouter. Même prix que la clé courte : le
  // préfixe dit par où l'appel passe, pas ce que le modèle vaut. OpenRouter
  // l'affiche aujourd'hui à 2/10 — le catalogue garde 3/15, qui est le tarif
  // public une fois la remise d'introduction expirée, et surestimer est le bon
  // sens de l'erreur pour un garde-fou de budget.
  "anthropic/claude-sonnet-5": { entreePerMillion: 3, sortiePerMillion: 15 },
};

/** Retenu pour un modèle inconnu : le plus cher de la table. */
export const TARIF_PAR_DEFAUT: Tarif = { entreePerMillion: 5, sortiePerMillion: 25 };

/**
 * Les remises d'introduction, avec leur date de fin.
 *
 * Elles sont datées parce qu'elles s'arrêtent, et qu'une remise qu'on oublie
 * fait croire à une dépense qui double du jour au lendemain sans raison. La date
 * est le dernier jour où le tarif réduit s'applique.
 */
export const INTRODUCTION: Record<string, { jusquAu: string; tarif: Tarif }> = {
  "claude-sonnet-5": {
    jusquAu: "2026-08-31",
    tarif: { entreePerMillion: 2, sortiePerMillion: 10 },
  },
};

export function tarifCatalogue(modele: string): Tarif {
  return CATALOGUE[modele] ?? TARIF_PAR_DEFAUT;
}

/**
 * Le tarif réellement facturé un jour donné.
 *
 * Le jour est une étiquette `AAAA-MM-JJ` et se compare comme une chaîne : c'est
 * ce qui rend la bascule insensible au fuseau de la machine qui pose la question.
 */
export function tarifReel(modele: string, jour: string): Tarif {
  const remise = INTRODUCTION[modele];

  if (remise && jour <= remise.jusquAu) return remise.tarif;

  return tarifCatalogue(modele);
}

/**
 * De quoi multiplier un coût catalogue pour obtenir le coût réel.
 *
 * Passer par un facteur plutôt que de recalculer depuis les tokens n'est pas un
 * raccourci : `AiCall` ne garde pas si l'appel est parti en envoi groupé, et la
 * remise de moitié qui va avec serait perdue au recalcul. Le facteur, lui,
 * traverse toutes les remises multiplicatives — groupage comme cache — sans avoir
 * besoin de les connaître.
 *
 * Il n'existe que si l'entrée et la sortie sont réduites dans la même
 * proportion. Sinon le facteur dépendrait du mélange entrée/sortie de chaque
 * appel, et un chiffre unique mentirait : on rend `null`, à charge de l'appelant
 * de ne pas afficher ce qu'il ne sait pas.
 */
export function facteurDuTarifReel(modele: string, jour: string): number | null {
  const catalogue = tarifCatalogue(modele);
  const reel = tarifReel(modele, jour);

  const surEntree = reel.entreePerMillion / catalogue.entreePerMillion;
  const surSortie = reel.sortiePerMillion / catalogue.sortiePerMillion;

  // Comparaison à epsilon : deux divisions flottantes qui devraient tomber juste
  // ne tombent pas toujours sur le même bit.
  if (Math.abs(surEntree - surSortie) > 1e-9) return null;

  return surEntree;
}

export type CoutSelonConvention = {
  catalogue: number;
  /** Nul quand la remise ne se ramène pas à un facteur unique. */
  reel: number | null;
};

/** Les deux lectures d'un même coût déjà enregistré. */
export function coutSelonConventions(
  coutCatalogue: number,
  modele: string,
  jour: string,
): CoutSelonConvention {
  const facteur = facteurDuTarifReel(modele, jour);

  return {
    catalogue: coutCatalogue,
    reel: facteur === null ? null : coutCatalogue * facteur,
  };
}
