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

/**
 * Deux compteurs, deux usages.
 *
 * `sessionCount` est le seul que la rotation lit : c'est lui qui décide de la
 * formulation servie demain, et l'entraînement libre ne doit pas y toucher.
 * Quelqu'un qui tourne dix fois sur un concept en dix minutes ne doit pas voir
 * sa session du lendemain changer de forme pour autant.
 *
 * `trainingCount` ne pilote rien mais il use : c'est la somme des deux qui dit
 * quand les formulations ont fait leur temps.
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

function estPlusAncienne(candidate: VarianteServable, reference: VarianteServable): boolean {
  const aCandidate = vueLe(candidate);
  const aReference = vueLe(reference);

  // Deux variantes jamais servies portent la même valeur infinie : c'est
  // l'identifiant qui tranche, sans quoi l'ordre dépendrait de la requête.
  if (aCandidate !== aReference) return aCandidate < aReference;

  return candidate.id.localeCompare(reference.id) < 0;
}

/**
 * Passages par facette, sous le compteur qu'on lui demande de lire.
 *
 * La rotation compte les passages en session ; l'usure compte les deux modes.
 * C'est la même arithmétique, ce n'est pas la même question.
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
  const vues = vuesParFacette(tirage, enSession);

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
 * Les deux modes s'additionnent. Ce qui use une formulation, c'est de l'avoir
 * lue, pas le mode sous lequel on l'a lue : quelqu'un qui tourne beaucoup en
 * entraînement épuise ses questions plus vite et déclenche leur renouvellement
 * sans avoir de bouton à trouver ni de décision à prendre.
 *
 * La condition porte sur les facettes présentes plutôt que sur un compte figé à
 * quatre : un concept qui en porterait trois serait épuisé avec trois, et le
 * jour où le lot change de taille cette fonction n'a pas à changer.
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
 * Les compteurs sont lus avant d'être incrémentés en base. Sans ce recalcul, il
 * faudrait attendre le passage suivant pour s'apercevoir que le seuil vient
 * d'être franchi — et sur un concept qui n'est plus dû avant trois semaines,
 * « le passage suivant » veut dire trois semaines.
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
 * Jours entre deux écritures de questions pour un même concept.
 *
 * Le seuil d'usure seul ne suffit pas depuis que l'entraînement est illimité :
 * quelqu'un qui tourne une heure sur ses trois concepts atteint le seuil le
 * jour même, et rien n'empêcherait la régénération de repartir aussitôt après.
 * Ce plafond borne la dépense d'un concept et casse la boucle.
 */
export const JOURS_ENTRE_REGENERATIONS = 7;

/**
 * Assez de temps a-t-il passé depuis la dernière écriture de questions ?
 *
 * `derniere` est la dernière fois qu'on a demandé des questions pour ce
 * concept, réussite ou échec — c'est la dépense qu'on plafonne, pas le
 * résultat. Un concept qui n'en a jamais eu n'attend pas.
 */
export function assezEspacee(derniere: Date | null, maintenant: Date): boolean {
  if (!derniere) return true;

  const ecoules = maintenant.getTime() - derniere.getTime();

  return ecoules >= JOURS_ENTRE_REGENERATIONS * 24 * 60 * 60 * 1000;
}
