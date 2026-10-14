/**
 * Le coût d'un appel selon deux conventions, montrées côte à côte :
 *
 * - **catalogue** : le tarif public, celui écrit dans `AiCall`. Surestimer est
 *   le bon sens de l'erreur pour un garde-fou de budget.
 * - **réel** : ce qui est facturé ce jour-là, remises d'introduction comprises.
 *   Sans lui, le tableau de bord annonce une facture qu'on ne paie pas.
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
  // Slug court (tel qu'`AI_MODEL` le porte) et identifiant OpenRouter complet :
  // même tarif, les deux clés évitent de deviner qui appelle.
  "gpt-5.6-luna": { entreePerMillion: 0.2, sortiePerMillion: 1.2 },
  "openai/gpt-5.6-luna": { entreePerMillion: 0.2, sortiePerMillion: 1.2 },
  // Le repli, routé par OpenRouter : le préfixe dit la route, pas le prix. Le
  // catalogue garde le tarif public même quand OpenRouter affiche une remise.
  "anthropic/claude-sonnet-5": { entreePerMillion: 3, sortiePerMillion: 15 },
};

/** Retenu pour un modèle inconnu : le plus cher de la table. */
export const TARIF_PAR_DEFAUT: Tarif = { entreePerMillion: 5, sortiePerMillion: 25 };

/**
 * Les remises d'introduction. `jusquAu` est le dernier jour du tarif réduit :
 * datées, leur fin ne se lit pas comme une dépense qui double sans raison.
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
 * Le tarif réellement facturé un jour donné. `jour` est une étiquette
 * `AAAA-MM-JJ` comparée comme une chaîne, insensible au fuseau de la machine.
 */
export function tarifReel(modele: string, jour: string): Tarif {
  const remise = INTRODUCTION[modele];

  if (remise && jour <= remise.jusquAu) return remise.tarif;

  return tarifCatalogue(modele);
}

/**
 * De quoi multiplier un coût catalogue pour obtenir le coût réel.
 *
 * Un facteur plutôt qu'un recalcul depuis les tokens : il traverse les remises
 * multiplicatives déjà comprises dans le coût enregistré (cache, envoi groupé)
 * sans les connaître. `null` si l'entrée et la sortie ne sont pas réduites dans
 * la même proportion : le facteur dépendrait alors du mélange de chaque appel.
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
