/**
 * Rendre exploitables les options d'un QCM que le modèle vient de rendre.
 *
 * Le nombre d'options et la borne de l'index ne sont que des indications pour
 * le modèle (voir `lib/ai/output-schema.ts`) : refuser une option de trop
 * ferait perdre tout le lot, appel payé.
 *
 * On garde la bonne réponse et les premières mauvaises jusqu'au compte voulu.
 * Ce n'est pas un ordre d'affichage : il est décidé par
 * `lib/domain/ordre-des-options.ts`.
 *
 * Seul un index qui ne désigne aucune option est irrécupérable (`null`) : la
 * bonne réponse est inconnue.
 */

export const OPTIONS_PAR_QCM = 4;

export type OptionsNormalisees = { options: string[]; correctIndex: number };

/** Ce qu'on lit à l'écran, une fois les espaces ramenés à ce qu'ils valent. */
function telQuAffiche(option: string): string {
  return option.trim().replace(/\s+/g, " ");
}

/**
 * Les options affichent-elles au moins deux textes différents ? Un modèle peut
 * abréger toutes ses options en « ... ».
 *
 * Seuls les espaces sont normalisés, car c'est l'affichage qui compte :
 * `at(-1)` et `at(1)` restent deux réponses différentes.
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
