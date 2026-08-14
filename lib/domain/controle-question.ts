import type { Manquement } from "./manquement";
import { TROU } from "./reponse-cloze";

/**
 * Ce qui se vérifie sur une question prise à part, sans regarder ses voisines :
 * ce que son format lui impose, et la réponse qui se lirait dans l'énoncé.
 *
 * La composition du lot — les quatre facettes, la diversité des formats, le
 * quota de texte libre — se contrôle ailleurs : voir `controle-variants.ts`.
 */

export type VariantAControler = {
  format: string;
  facet: string;
  question: string;
  answerKey: string;
  options: string[] | null;
  correctIndex: number | null;
  cloze?: { sentence: string; accepted: string[] } | null;
};

/**
 * Ce qu'on tolère entre la plus longue et la plus courte option d'un MCQ.
 *
 * Deux seuils, parce qu'un seul se trompe : sur des options courtes — quatre
 * expressions de code — le rapport s'envole sans que la bonne réponse se
 * repère, et sur des options longues c'est l'écart absolu qui ne dit rien.
 * Une option n'est signalée que si elle dépasse les deux.
 */
export const ECART_MAX_OPTIONS = 2;
export const ECART_MINIMUM_SIGNIFICATIF = 30;

/** Le trou fait un à trois mots, jamais une proposition entière. */
export const MOTS_MAX_DU_TROU = 3;

/** Nombre de mots en deçà duquel une réponse citée ne prouve rien. */
const MOTS_MINIMUM_POUR_CITER = 3;

function motsNormalises(texte: string): string {
  return ` ${texte
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()} `;
}

function controlerMcq(variant: VariantAControler): Manquement[] {
  const { options, correctIndex } = variant;

  if (variant.format !== "MCQ") {
    return options === null && correctIndex === null
      ? []
      : [{ regle: "options", detail: `format ${variant.format} avec des options` }];
  }

  if (options === null || options.length !== 4) {
    return [{ regle: "options", detail: `${options?.length ?? 0} options au lieu de quatre` }];
  }

  if (correctIndex === null || correctIndex < 0 || correctIndex >= options.length) {
    return [{ regle: "options", detail: `correctIndex hors des options : ${correctIndex}` }];
  }

  const longueurs = options.map((option) => option.length);
  const plusCourte = Math.min(...longueurs);
  const plusLongue = Math.max(...longueurs);
  const rapport = plusLongue / plusCourte;

  if (rapport <= ECART_MAX_OPTIONS || plusLongue - plusCourte <= ECART_MINIMUM_SIGNIFICATIF) {
    return [];
  }

  return [
    {
      regle: "longueurs",
      detail: `la plus longue option fait ${rapport.toFixed(1)}× la plus courte (${plusLongue} contre ${plusCourte} caractères)`,
    },
  ];
}

/**
 * Le texte à trou : un seul trou, et ce qui manque tient en trois mots.
 *
 * La longueur se mesure sur la première forme acceptée — le terme masqué, que
 * le schéma demande en tête de liste. Un trou qui avale une proposition entière
 * ne se retrouve pas, il se reformule : la comparaison échouera sur une réponse
 * pourtant juste, et la personne apprendra à cliquer « je l'avais ».
 */
function controlerCloze(variant: VariantAControler): Manquement[] {
  const cloze = variant.cloze ?? null;

  if (variant.format !== "CLOZE") {
    return cloze === null
      ? []
      : [{ regle: "trou", detail: `format ${variant.format} avec une phrase trouée` }];
  }

  if (cloze === null) {
    return [{ regle: "trou", detail: "un CLOZE sans phrase trouée ni formes acceptées" }];
  }

  const trous = cloze.sentence.split(TROU).length - 1;

  if (trous !== 1) {
    return [{ regle: "trou", detail: `${trous} trous dans la phrase, un seul attendu` }];
  }

  const terme = (cloze.accepted[0] ?? "").trim();
  const mots = terme.split(/\s+/).filter(Boolean);

  if (mots.length === 0 || mots.length > MOTS_MAX_DU_TROU) {
    return [{ regle: "trou", detail: `le terme masqué fait ${mots.length} mots : « ${terme} »` }];
  }

  return [];
}

/** La réponse attendue ne doit pas se lire dans l'énoncé. */
function controlerReponseCachee(variant: VariantAControler): Manquement[] {
  const [premierePhrase = ""] = variant.answerKey.split(/[.\n]/);
  const reponse = motsNormalises(premierePhrase);

  if (reponse.trim().split(" ").filter(Boolean).length < MOTS_MINIMUM_POUR_CITER) return [];
  if (!motsNormalises(variant.question).includes(reponse)) return [];

  return [
    { regle: "réponse citée", detail: `« ${premierePhrase.trim()} » figure dans la question` },
  ];
}

/** Tout ce qu'on peut reprocher à une question sans regarder les autres. */
export function controlerQuestion(variant: VariantAControler): Manquement[] {
  return [...controlerMcq(variant), ...controlerCloze(variant), ...controlerReponseCachee(variant)];
}
