/**
 * Rendre exploitables les options d'un QCM rendu par le modèle. Leur nombre
 * n'est qu'une indication pour lui (`lib/ai/schema-de-sortie.ts`) : refuser une
 * option de trop perdrait le lot, appel payé. L'ordre rendu n'est pas celui
 * d'affichage (`ordre-des-options.ts`). Seul un index hors des options est
 * irrécupérable (`null`).
 */

export const OPTIONS_PAR_QCM = 4;

export type OptionsNormalisees = { options: string[]; correctIndex: number };

/** Ce qu'on lit à l'écran, une fois les espaces ramenés à ce qu'ils valent. */
function telQuAffiche(option: string): string {
  return option.trim().replace(/\s+/g, " ");
}

/**
 * Un modèle peut abréger toutes ses options en « ... ». Seuls les espaces sont
 * normalisés : `at(-1)` et `at(1)` restent deux réponses différentes.
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
