/**
 * Rendre exploitables les options d'un QCM que le modèle vient de rendre.
 *
 * Le schéma demandait exactement quatre options et un index entre 0 et 3. Ni
 * l'un ni l'autre n'est tenu par la grammaire — ce sont des indications, comme
 * toutes les bornes chiffrées (voir `lib/ai/output-schema.ts`). Cinq options
 * avec un index à 4 faisaient donc tomber le lot entier : trois concepts de
 * questions perdus, appel payé, pour une option de trop.
 *
 * On récupère au lieu de refuser. La seule chose qui compte est que la bonne
 * réponse survive : on la garde, on complète avec les mauvaises jusqu'au compte
 * voulu, et l'ordre définitif est décidé plus tard par
 * `lib/domain/ordre-des-options.ts`. Ce que cette fonction rend n'est donc pas
 * un ordre d'affichage, seulement un jeu d'options utilisable.
 *
 * Un seul cas reste irrécupérable, et il est signalé : un index qui ne désigne
 * aucune option. Là, personne ne sait plus quelle réponse est la bonne, et
 * servir la question reviendrait à noter faux quelqu'un qui a raison.
 */

export const OPTIONS_PAR_QCM = 4;

export type OptionsNormalisees = { options: string[]; correctIndex: number };

/** Ce qu'on lit à l'écran, une fois les espaces ramenés à ce qu'ils valent. */
function telQuAffiche(option: string): string {
  return option.trim().replace(/\s+/g, " ");
}

/**
 * Peut-on distinguer ces options les unes des autres ?
 *
 * Un QCM servi le 23 septembre 2026 posait quatre fois « ... » : le modèle
 * avait écrit la question, puis abrégé ses options. Rien n'était vide, l'index
 * désignait bien une option — et on demandait pourtant de choisir entre quatre
 * propositions identiques, où trois clics sur quatre comptent faux sans que
 * personne puisse faire mieux.
 *
 * Deux options qui ne diffèrent que par leurs espaces sont la même option : ce
 * qui compte est ce qui s'affiche, pas ce qui est stocké. On ne va pas plus
 * loin dans la normalisation — `at(-1)` et `at(1)` se ressemblent beaucoup et
 * restent deux réponses différentes.
 */
export function optionsDistinguables(options: readonly string[]): boolean {
  return new Set(options.map(telQuAffiche)).size >= 2;
}

export function normaliserLesOptions(
  options: readonly string[],
  correctIndex: number,
  combien: number = OPTIONS_PAR_QCM,
): OptionsNormalisees | null {
  const bonne = options[correctIndex];

  if (bonne === undefined) return null;
  if (options.length <= combien) return { options: [...options], correctIndex };

  const autres = options.filter((_, rang) => rang !== correctIndex).slice(0, combien - 1);

  return { options: [bonne, ...autres], correctIndex: 0 };
}
