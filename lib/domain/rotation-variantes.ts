/**
 * Quelle question poser quand un concept remonte. Aucune échéance ici, seulement
 * une formulation : la facette la moins vue, la plus ancienne pour départager,
 * jamais celle qui vient d'être servie, pour qu'il faille connaître l'idée.
 *
 * Les questions se réécrivent à l'usure (`regenererSiUsees`, chaque facette vue
 * `PASSAGES_AVANT_REGENERATION` fois, deux modes additionnés), au plus une fois
 * par `JOURS_ENTRE_REGENERATIONS`, sans quoi l'entraînement illimité rouvrirait
 * la dépense dans l'heure. Les réécritures explicites passent par le même
 * plafond (voir `lib/db/demande-de-questions.ts` et `renvoi-au-concept.ts`).
 */

/** Au-delà, on reconnaît les formulations plutôt que le concept. */
export const PASSAGES_AVANT_REGENERATION = 3;

/**
 * La rotation ne lit que `sessionCount` : l'entraînement ne doit pas changer la
 * formulation du lendemain. `trainingCount` ne compte que dans l'usure.
 */
export type VarianteServable = {
  id: string;
  facet: string;
  sessionCount: number;
  trainingCount: number;
  lastSessionAt: Date | null;
};

/** Jamais servie en session, elle passe devant. */
function vueLe(variante: VarianteServable): number {
  return variante.lastSessionAt ? variante.lastSessionAt.getTime() : Number.NEGATIVE_INFINITY;
}

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
 * Les ex aequo, que l'appelant départage lui-même : les variantes naissent d'un
 * même `createMany`, et si l'identifiant tranchait, toute une session tomberait
 * sur un seul format. `derniereFacette` sort du tirage, sauf s'il ne reste qu'elle.
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
 * Les deux modes additionnés : ce qui use une formulation, c'est de l'avoir lue.
 * Sur les facettes présentes, pas sur un compte figé à quatre.
 */
export function doitRegenerer(variantes: VarianteServable[]): boolean {
  if (variantes.length === 0) return false;

  return [...vuesParFacette(variantes, enTout).values()].every(
    (vues) => vues >= PASSAGES_AVANT_REGENERATION,
  );
}

/**
 * Les compteurs sont lus avant leur incrément en base : sans ce recalcul, le
 * seuil franchi ne se verrait qu'au passage suivant, parfois des semaines après.
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

/** L'usure seule ne suffit pas : l'entraînement illimité l'atteint le jour même. */
export const JOURS_ENTRE_REGENERATIONS = 7;

/** `derniere` compte aussi les échecs : c'est la dépense qu'on plafonne. */
export function assezEspacee(derniere: Date | null, maintenant: Date): boolean {
  if (!derniere) return true;

  const ecoules = maintenant.getTime() - derniere.getTime();

  return ecoules >= JOURS_ENTRE_REGENERATIONS * 24 * 60 * 60 * 1000;
}
