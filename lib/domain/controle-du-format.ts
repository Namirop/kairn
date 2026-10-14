import type { VariantAControler } from "./controle-question";
import { controlerCloze } from "./controle-du-trou";
import type { Manquement } from "./manquement";

/**
 * Ce que son format impose à une question : les options d'un MCQ, le trou d'un
 * CLOZE (`controle-du-trou.ts`), la valeur d'un vrai ou faux, et aucune charge sur un format qui n'en
 * porte pas.
 */

/**
 * L'écart toléré entre la plus longue et la plus courte option d'un MCQ.
 * Signalé seulement si les deux seuils sont dépassés : sur des options courtes
 * le rapport s'envole sans trahir la réponse, sur des longues c'est l'écart
 * absolu qui ne dit rien.
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
 * Le vrai ou faux, relu contre la valeur que l'envoi imposait à cette question :
 * le modèle ne tient pas une proportion demandée globalement.
 *
 * Un écart est un manquement, jamais un refus : la question reste servable,
 * elle est seulement comptée du mauvais côté de la répartition.
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

/**
 * La charge écartée à la relecture. La sortie n'en garde pas trace, d'où le
 * drapeau posé par le schéma ; sans lui, un modèle fautif serait rattrapé en
 * silence indéfiniment.
 */
function controlerCharge(variant: VariantAControler): Manquement[] {
  if (!variant.chargeIgnoree) return [];

  return [{ regle: "charge", detail: `une charge jointe à un format ${variant.format}, écartée` }];
}

/** Tout ce que le format de cette question lui reproche. */
export function controlerLeFormat(variant: VariantAControler): Manquement[] {
  return [
    ...controlerMcq(variant),
    ...controlerCloze(variant),
    ...controlerVraiOuFaux(variant),
    ...controlerCharge(variant),
  ];
}
