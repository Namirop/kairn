import type { VariantAControler } from "./controle-question";
import { controlerCloze } from "./controle-du-trou";
import type { Manquement } from "./manquement";

/** Ce que son format impose à une question ; le trou d'un CLOZE vit dans `controle-du-trou.ts`. */

/**
 * Signalé seulement si les deux seuils sont dépassés : sur des options courtes
 * le rapport s'envole sans trahir la réponse, sur des longues l'écart absolu.
 */
export const ECART_MAX_OPTIONS = 2;
export const ECART_MINIMUM_SIGNIFICATIF = 30;

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
 * Relu contre la valeur imposée à cette question : le modèle ne tient pas une
 * proportion demandée globalement. Un écart est un manquement, pas un refus.
 */
function controlerVraiOuFaux(variant: VariantAControler): Manquement[] {
  const rendue = variant.estVraie ?? null;

  if (variant.format !== "TRUE_FALSE") {
    return rendue === null
      ? []
      : [{ regle: "vrai ou faux", detail: `format ${variant.format} avec estVraie` }];
  }

  if (rendue === null) {
    return [{ regle: "vrai ou faux", detail: "l'affirmation ne dit pas si elle est vraie" }];
  }

  const cible = variant.cible ?? null;

  if (cible === null || cible === rendue) return [];

  return [
    {
      regle: "vrai ou faux",
      detail: `affirmation ${rendue ? "vraie" : "fausse"} alors que l'envoi demandait ${cible ? "vraie" : "fausse"}`,
    },
  ];
}

/** La sortie ne garde pas trace de la charge écartée : sans ce drapeau, la faute passerait en silence. */
function controlerCharge(variant: VariantAControler): Manquement[] {
  if (!variant.chargeIgnoree) return [];

  return [{ regle: "charge", detail: `une charge jointe à un format ${variant.format}, écartée` }];
}

export function controlerLeFormat(variant: VariantAControler): Manquement[] {
  return [
    ...controlerMcq(variant),
    ...controlerCloze(variant),
    ...controlerVraiOuFaux(variant),
    ...controlerCharge(variant),
  ];
}
