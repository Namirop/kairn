/**
 * Quelle question poser quand un concept remonte.
 *
 * La planification porte sur le concept ; la variante n'est que la porte par
 * laquelle on y entre. Ce fichier ne calcule donc aucune échéance, aucun
 * intervalle, aucune difficulté — il choisit une formulation, rien de plus.
 *
 * On sert la facette la moins vue, la plus ancienne pour départager, et jamais
 * celle qui vient d'être servie. C'est ce qui fait qu'un concept revu cinq fois
 * reste inconfortable : il faut connaître l'idée, pas se souvenir d'une phrase.
 */

/**
 * Passages par facette au-delà desquels les questions sont usées.
 *
 * Quand chaque facette a été vue autant de fois, la personne reconnaît les
 * formulations plutôt que le concept, et il est temps d'en réécrire.
 */
export const PASSAGES_AVANT_REGENERATION = 3;

export type VarianteServable = {
  id: string;
  facet: string;
  seenCount: number;
  lastSeenAt: Date | null;
};

/** Jamais servie : elle passe avant tout ce qui l'a déjà été. */
function vueLe(variante: VarianteServable): number {
  return variante.lastSeenAt ? variante.lastSeenAt.getTime() : Number.NEGATIVE_INFINITY;
}

function estPlusAncienne(candidate: VarianteServable, reference: VarianteServable): boolean {
  const aCandidate = vueLe(candidate);
  const aReference = vueLe(reference);

  // Deux variantes jamais servies portent la même valeur infinie : c'est
  // l'identifiant qui tranche, sans quoi l'ordre dépendrait de la requête.
  if (aCandidate !== aReference) return aCandidate < aReference;

  return candidate.id.localeCompare(reference.id) < 0;
}

function vuesParFacette(variantes: VarianteServable[]): Map<string, number> {
  const total = new Map<string, number>();

  for (const variante of variantes) {
    total.set(variante.facet, (total.get(variante.facet) ?? 0) + variante.seenCount);
  }

  return total;
}

/**
 * La variante à poser, ou `null` si le concept n'a aucune question active.
 *
 * `derniereFacette` est celle du passage précédent sur ce concept. Elle sort du
 * tirage — sauf s'il ne reste qu'elle, auquel cas la reposer vaut mieux que ne
 * rien poser du tout.
 */
export function choisirVariante(
  variantes: VarianteServable[],
  derniereFacette: string | null,
): VarianteServable | null {
  if (variantes.length === 0) return null;

  const autres = variantes.filter((variante) => variante.facet !== derniereFacette);
  const tirage = autres.length > 0 ? autres : variantes;
  const vues = vuesParFacette(tirage);

  return tirage.reduce((meilleure, candidate) => {
    const vuesCandidate = vues.get(candidate.facet) ?? 0;
    const vuesMeilleure = vues.get(meilleure.facet) ?? 0;

    if (vuesCandidate !== vuesMeilleure) {
      return vuesCandidate < vuesMeilleure ? candidate : meilleure;
    }

    return estPlusAncienne(candidate, meilleure) ? candidate : meilleure;
  });
}

/**
 * Les questions de ce concept ont-elles fait leur temps ?
 *
 * On compte par facette et non par variante : c'est la facette qui est l'angle
 * interrogé, et deux variantes d'une même facette usent le même angle.
 *
 * La condition porte sur les facettes présentes plutôt que sur un compte figé à
 * quatre : un concept qui en porterait trois serait épuisé avec trois, et le
 * jour où le lot change de taille cette fonction n'a pas à changer.
 */
export function doitRegenerer(variantes: VarianteServable[]): boolean {
  if (variantes.length === 0) return false;

  return [...vuesParFacette(variantes).values()].every(
    (vues) => vues >= PASSAGES_AVANT_REGENERATION,
  );
}
