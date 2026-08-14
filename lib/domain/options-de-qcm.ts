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
