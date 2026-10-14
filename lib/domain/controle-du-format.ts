import { termeDebordeSurLaPhrase } from "./bord-du-trou";
import type { VariantAControler } from "./controle-question";
import type { Manquement } from "./manquement";
import { motsNormalises } from "./mots-normalises";
import { TROU } from "./reponse-cloze";
import { trouDevoileSaReponse } from "./trou-devoile";

/**
 * Ce que son format impose à une question : les options d'un MCQ, le trou d'un
 * CLOZE, la valeur d'un vrai ou faux, et aucune charge sur un format qui n'en
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

/** Le trou fait un à trois mots, jamais une proposition entière. */
export const MOTS_MAX_DU_TROU = 3;

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
 * La longueur se mesure sur la première forme acceptée, le terme masqué. Un
 * trou plus long se reformule au lieu de se retrouver, et la comparaison
 * échoue sur une réponse juste.
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

  /*
    Un terme qui redit un mot posé contre le trou (« de ___ semaines », terme
    « 52 semaines ») : « 52 », juste, serait compté faux. Réparé à la lecture
    par `trouSansRedite` ; signalé pour que le banc dise si le prompt tient.
  */
  if (termeDebordeSurLaPhrase(cloze.sentence, terme)) {
    return [
      {
        regle: "trou",
        detail: `le terme masqué redit un mot qui borde le trou : « ${terme} »`,
      },
    ];
  }

  /*
    Un terme écrit en clair ailleurs dans sa propre phrase : le trou ne demande
    plus que de recopier. La question marche mais ne teste plus rien, donc rien
    à réparer à la lecture ; le signalement dit si la consigne du prompt tient.
  */
  if (trouDevoileSaReponse(cloze.sentence, terme)) {
    return [
      {
        regle: "trou",
        detail: `le terme masqué est écrit ailleurs dans la phrase : « ${terme} »`,
      },
    ];
  }

  /*
    Un leurre qui est une forme acceptée met deux bonnes réponses dans l'aide.
    Signalé sans refus : `pistesDuTrou` retire le doublon à l'affichage, mais
    un modèle qui le fait souvent doit se voir au banc.
  */
  const acceptees = new Set(cloze.accepted.map((forme) => motsNormalises(forme)));
  const doublons = (cloze.leurres ?? []).filter((leurre) => acceptees.has(motsNormalises(leurre)));

  if (doublons.length > 0) {
    return [{ regle: "trou", detail: `leurre accepté comme réponse : « ${doublons[0]} »` }];
  }

  return [];
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
