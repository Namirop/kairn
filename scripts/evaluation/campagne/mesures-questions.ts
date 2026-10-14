import type { Vecteur } from "../mesures/espace";
import { pairesTriees } from "../mesures/geometrie";
import { PLANCHER_RADOTAGE_INTER, PLANCHER_RADOTAGE_INTRA } from "../mesures/seuils";
import type { VariantServi } from "./questions-servies";

/**
 * Les mesures internes de la campagne 2, sans juge : radotage (paires au-dessus
 * des planchers de `mesures/seuils.ts`, intra et inter séparés), diversité des
 * formats sur les quatre facettes, et respect de la cible du vrai ou faux
 * imposée par `cibleDuVraiOuFaux`.
 */

export type MesuresDuDepot = {
  nom: string;
  concepts: number;
  variants: number;
  radotage: { intra: number; inter: number };
  formats: { conceptsAvec4FormatsDistincts: number };
  cibleVraiFaux: { total: number; manquees: number };
};

/** Une question située dans son concept, pour distinguer intra/inter. */
type QuestionSituee = { texte: string; concept: number };

/** Pour un CLOZE, la phrase à trou : voir `mesures/signaux.ts`. */
function texteARadoter(variant: VariantServi): string {
  if (variant.format === "CLOZE" && variant.cloze) return variant.cloze.sentence;
  return variant.question;
}

/** Toutes les questions d'un dépôt à mesurer, avec leur rang de concept. */
export function questionsARadoter(variantsParConcept: readonly VariantServi[][]): QuestionSituee[] {
  return variantsParConcept.flatMap((variants, rangConcept) =>
    variants.map((variant) => ({ texte: texteARadoter(variant), concept: rangConcept })),
  );
}

/** Compte les paires signalées intra-lot et inter-concepts, au-dessus des planchers. */
export function compterLeRadotage(
  variantsParConcept: readonly VariantServi[][],
  vecteur: (texte: string) => Vecteur,
): { intra: number; inter: number } {
  const questions = questionsARadoter(variantsParConcept);
  const paires = pairesTriees(questions.map((q) => vecteur(q.texte)));

  let intra = 0;
  let inter = 0;

  for (const paire of paires) {
    const un = questions[paire.un];
    const deux = questions[paire.deux];
    if (!un || !deux) continue;

    if (un.concept === deux.concept) {
      if (paire.proximite >= PLANCHER_RADOTAGE_INTRA) intra += 1;
    } else {
      if (paire.proximite >= PLANCHER_RADOTAGE_INTER) inter += 1;
    }
  }

  return { intra, inter };
}

/** Combien de concepts couvrent leurs 4 facettes avec 4 formats distincts. */
export function compterLaDiversiteDesFormats(
  variantsParConcept: readonly VariantServi[][],
): number {
  let conceptsAvec4FormatsDistincts = 0;
  for (const variants of variantsParConcept) {
    if (variants.length !== 4) continue;
    const formats = new Set(variants.map((v) => v.format));
    if (formats.size === 4) conceptsAvec4FormatsDistincts += 1;
  }
  return conceptsAvec4FormatsDistincts;
}

/** Compte les TRUE_FALSE dont `estVraie` ne matche pas la cible imposée. */
export function compterLesCiblesManquees(variantsParConcept: readonly VariantServi[][]): {
  total: number;
  manquees: number;
} {
  let total = 0;
  let manquees = 0;
  for (const variants of variantsParConcept) {
    for (const variant of variants) {
      if (variant.format !== "TRUE_FALSE") continue;
      if (variant.cible === null) continue;
      total += 1;
      if (variant.estVraie === null || variant.estVraie !== variant.cible) manquees += 1;
    }
  }
  return { total, manquees };
}

/** Les trois mesures internes réunies pour un dépôt. */
export function mesurerLeDepotQuestions(
  nom: string,
  variantsParConcept: readonly VariantServi[][],
  vecteur: (texte: string) => Vecteur,
): MesuresDuDepot {
  return {
    nom,
    concepts: variantsParConcept.length,
    variants: variantsParConcept.reduce((s, v) => s + v.length, 0),
    radotage: compterLeRadotage(variantsParConcept, vecteur),
    formats: { conceptsAvec4FormatsDistincts: compterLaDiversiteDesFormats(variantsParConcept) },
    cibleVraiFaux: compterLesCiblesManquees(variantsParConcept),
  };
}
