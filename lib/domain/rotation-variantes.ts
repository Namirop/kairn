/**
 * Quelle question poser quand un concept remonte.
 *
 * La planification porte sur le concept : ce fichier ne calcule ni échéance, ni
 * intervalle, ni difficulté, il choisit une formulation. On sert la facette la
 * moins vue, la plus ancienne pour départager, et jamais celle qui vient d'être
 * servie, pour qu'il faille connaître l'idée et non une phrase.
 */

/**
 * Quand les questions d'un concept sont réécrites : c'est l'usage qui déclenche,
 * borné par deux règles.
 *
 * 1. L'usure : `regenererSiUsees`, appelé après chaque passage (session et
 *    entraînement), déclare le lot usé quand chaque facette a été vue
 *    `PASSAGES_AVANT_REGENERATION` fois, les deux modes additionnés.
 * 2. Le plafond : pas plus d'une réécriture tous les `JOURS_ENTRE_REGENERATIONS`
 *    jours par concept, sans quoi l'entraînement illimité rouvrirait la dépense
 *    dans l'heure.
 *
 * Ce qu'un lot perd à l'écriture ne se récupère donc pas la semaine suivante
 * (voir `renvoi-au-concept.ts`). Les réécritures explicites (modifier ou
 * confirmer un concept) passent par le même plafond : voir
 * `lib/db/demande-de-questions.ts`.
 */

/**
 * Passages par facette au-delà desquels la personne reconnaît les formulations
 * plutôt que le concept.
 */
export const PASSAGES_AVANT_REGENERATION = 3;

/**
 * `sessionCount` est le seul que la rotation lit : l'entraînement ne doit pas
 * changer la formulation servie en session le lendemain. `trainingCount` ne
 * pilote rien mais compte dans l'usure.
 */
export type VarianteServable = {
  id: string;
  facet: string;
  sessionCount: number;
  trainingCount: number;
  lastSessionAt: Date | null;
};

/** Jamais servie en session : elle passe avant tout ce qui l'a déjà été. */
function vueLe(variante: VarianteServable): number {
  return variante.lastSessionAt ? variante.lastSessionAt.getTime() : Number.NEGATIVE_INFINITY;
}

/**
 * Passages par facette, selon le compteur demandé : la rotation compte la
 * session seule, l'usure les deux modes.
 */
function vuesParFacette(
  variantes: VarianteServable[],
  compter: (variante: VarianteServable) => number,
): Map<string, number> {
  const total = new Map<string, number>();

  for (const variante of variantes) {
    total.set(variante.facet, (total.get(variante.facet) ?? 0) + compter(variante));
  }

  return total;
}

const enSession = (variante: VarianteServable) => variante.sessionCount;
const enTout = (variante: VarianteServable) => variante.sessionCount + variante.trainingCount;

/**
 * Les variantes que la rotation juge également bonnes, sans les départager :
 * facette la moins servie, puis la plus ancienne. Au-delà, la rotation n'a pas
 * d'avis.
 *
 * Exposé pour que l'appelant départage lui-même : l'identifiant ne veut rien
 * dire, car les variantes naissent d'un même `createMany` dans l'ordre du
 * modèle. S'il tranchait, tous les concepts neufs serviraient la même facette
 * le même jour, et une session entière tomberait sur un seul format.
 *
 * `derniereFacette` sort du tirage, sauf s'il ne reste qu'elle.
 */
export function variantesEquivalentes<T extends VarianteServable>(
  variantes: T[],
  derniereFacette: string | null,
): T[] {
  if (variantes.length === 0) return [];

  const autres = variantes.filter((variante) => variante.facet !== derniereFacette);
  const tirage = autres.length > 0 ? autres : variantes;
  const vues = vuesParFacette(tirage, enSession);
  const vuesDe = (variante: VarianteServable) => vues.get(variante.facet) ?? 0;

  const moinsVues = Math.min(...tirage.map(vuesDe));
  const candidates = tirage.filter((variante) => vuesDe(variante) === moinsVues);
  const plusAncienne = Math.min(...candidates.map(vueLe));

  return candidates
    .filter((variante) => vueLe(variante) === plusAncienne)
    .sort((une, deux) => une.id.localeCompare(deux.id));
}

/**
 * La variante à poser, ou `null` si le concept n'a aucune question active.
 *
 * L'identifiant tranche ici, ce qui suffit pour un concept seul. La session du
 * jour départage autrement, dans `repartition-des-formats.ts`.
 */
export function choisirVariante(
  variantes: VarianteServable[],
  derniereFacette: string | null,
): VarianteServable | null {
  return variantesEquivalentes(variantes, derniereFacette)[0] ?? null;
}

/**
 * Les questions de ce concept ont-elles fait leur temps ?
 *
 * On compte par facette (l'angle interrogé), les deux modes additionnés : ce
 * qui use une formulation, c'est de l'avoir lue. La condition porte sur les
 * facettes présentes, pas sur un compte figé à quatre.
 */
export function doitRegenerer(variantes: VarianteServable[]): boolean {
  if (variantes.length === 0) return false;

  return [...vuesParFacette(variantes, enTout).values()].every(
    (vues) => vues >= PASSAGES_AVANT_REGENERATION,
  );
}

/**
 * L'état des variantes une fois le passage compté.
 *
 * Les compteurs sont lus avant leur incrément en base : sans ce recalcul, le
 * seuil franchi ne se verrait qu'au passage suivant, parfois des semaines plus
 * tard.
 */
export function apresLePassage(
  variantes: VarianteServable[],
  servieId: string,
  mode: "SESSION" | "TRAINING",
): VarianteServable[] {
  return variantes.map((variante) => {
    if (variante.id !== servieId) return variante;

    return mode === "SESSION"
      ? { ...variante, sessionCount: variante.sessionCount + 1 }
      : { ...variante, trainingCount: variante.trainingCount + 1 };
  });
}

/**
 * Jours entre deux écritures de questions pour un même concept. Le seuil
 * d'usure seul ne suffit pas : l'entraînement illimité l'atteint le jour même.
 */
export const JOURS_ENTRE_REGENERATIONS = 7;

/**
 * Assez de temps a-t-il passé depuis la dernière écriture de questions ?
 *
 * `derniere` compte les demandes réussies comme échouées : c'est la dépense
 * qu'on plafonne, pas le résultat.
 */
export function assezEspacee(derniere: Date | null, maintenant: Date): boolean {
  if (!derniere) return true;

  const ecoules = maintenant.getTime() - derniere.getTime();

  return ecoules >= JOURS_ENTRE_REGENERATIONS * 24 * 60 * 60 * 1000;
}
