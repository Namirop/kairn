/**
 * Le coût d'un appel selon deux conventions. Le catalogue, écrit dans `AiCall`,
 * surestime : le bon sens de l'erreur pour un garde-fou de budget. Le réel
 * compte les remises, sans quoi le tableau de bord annonce une facture qu'on ne
 * paie pas.
 */

/** Dollars par million de tokens. */
export type Tarif = {
  entreePerMillion: number;
  sortiePerMillion: number;
};

export const CATALOGUE: Record<string, Tarif> = {
  "claude-opus-5": { entreePerMillion: 5, sortiePerMillion: 25 },
  "claude-sonnet-5": { entreePerMillion: 3, sortiePerMillion: 15 },
  "claude-haiku-4-5": { entreePerMillion: 1, sortiePerMillion: 5 },
  // Slug court d'`AI_MODEL` et identifiant OpenRouter : les deux formes arrivent.
  "gpt-5.6-luna": { entreePerMillion: 0.2, sortiePerMillion: 1.2 },
  "openai/gpt-5.6-luna": { entreePerMillion: 0.2, sortiePerMillion: 1.2 },
  // Le repli : le préfixe dit la route, pas le prix ; tarif public même remisé.
  "anthropic/claude-sonnet-5": { entreePerMillion: 3, sortiePerMillion: 15 },
};

/** Le plus cher de la table, pour un modèle inconnu. */
export const TARIF_PAR_DEFAUT: Tarif = { entreePerMillion: 5, sortiePerMillion: 25 };

/** `jusquAu` est inclus : datée, la fin d'une remise ne passe pas pour une dérive. */
export const INTRODUCTION: Record<string, { jusquAu: string; tarif: Tarif }> = {
  "claude-sonnet-5": {
    jusquAu: "2026-08-31",
    tarif: { entreePerMillion: 2, sortiePerMillion: 10 },
  },
};

export function tarifCatalogue(modele: string): Tarif {
  return CATALOGUE[modele] ?? TARIF_PAR_DEFAUT;
}

/** `jour` est une étiquette `AAAA-MM-JJ`, comparée comme une chaîne. */
export function tarifReel(modele: string, jour: string): Tarif {
  const remise = INTRODUCTION[modele];

  if (remise && jour <= remise.jusquAu) return remise.tarif;

  return tarifCatalogue(modele);
}

/**
 * Un facteur plutôt qu'un recalcul depuis les tokens : il traverse les remises
 * déjà comprises dans le coût enregistré (cache) sans les connaître. `null` si
 * entrée et sortie ne sont pas réduites dans la même proportion.
 */
export function facteurDuTarifReel(modele: string, jour: string): number | null {
  const catalogue = tarifCatalogue(modele);
  const reel = tarifReel(modele, jour);

  const surEntree = reel.entreePerMillion / catalogue.entreePerMillion;
  const surSortie = reel.sortiePerMillion / catalogue.sortiePerMillion;

  // Deux divisions flottantes égales en théorie ne tombent pas toujours sur le même bit.
  if (Math.abs(surEntree - surSortie) > 1e-9) return null;

  return surEntree;
}

export type CoutSelonConvention = {
  catalogue: number;
  /** Nul quand la remise ne se ramène pas à un facteur unique. */
  reel: number | null;
};

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
