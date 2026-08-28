import type { Manquement } from "./manquement";
import { renvoiAuConcept } from "./renvoi-au-concept";
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
  /** Ce que le modèle déclare : l'affirmation posée est-elle vraie. */
  estVraie?: boolean | null;
  /** Ce que l'envoi lui demandait. Absente quand l'appelant ne la connaît pas. */
  cible?: boolean | null;
  /** Une charge jointe à un format qui n'en porte pas, écartée à la relecture. */
  chargeIgnoree?: boolean;
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

/**
 * Le vrai ou faux, relu contre la cible que l'envoi lui avait fixée.
 *
 * Le modèle ne décide plus de la proportion — il ne l'a jamais tenue, 88 % de
 * fausses au passage du 14/08 — mais d'une valeur par question, imposée. Ce
 * contrôle est la seule chose qui dise si la consigne locale prend là où la
 * consigne de distribution n'a pas pris.
 *
 * L'écart est un manquement et jamais un refus : la question reste servable,
 * elle est juste comptée du mauvais côté de la répartition.
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

/**
 * La charge écartée à la relecture.
 *
 * La sortie ne porte plus la trace de ce qui a été retiré — c'est le but — donc
 * le contrôle ne peut pas la retrouver. Il lit le drapeau posé par le schéma.
 * Sans ce manquement, un modèle qui joint systématiquement une phrase trouée à
 * la mauvaise question serait rattrapé en silence, indéfiniment.
 */
function controlerCharge(variant: VariantAControler): Manquement[] {
  if (!variant.chargeIgnoree) return [];

  return [{ regle: "charge", detail: `une charge jointe à un format ${variant.format}, écartée` }];
}

/**
 * Un texte de question qui est une coquille — mot littéral « placeholder »,
 * ou consigne générique qui ne redit rien de la question réelle.
 *
 * Le figé du 18/08 en portait 71 sur 192 CLOZE : « placeholder », « Complète
 * la phrase du concept. », « Complète la phrase décrivant l'effet du X. ».
 * L'écran de révision d'un CLOZE affiche `cloze.sentence`, jamais ce champ,
 * donc l'utilisateur ne voit rien — mais la mesure du radotage, elle,
 * comparait ces coquilles entre elles et produisait des paires à 1,000.
 *
 * La dérivation dans `generate-variants.ts` couvre le cas CLOZE côté source ;
 * ce contrôle attrape le reste — coquille sur un autre format, ou régression
 * du fix. Signalé, pas refusé : la question part quand même en base, un
 * manquement au banc suffit à ne pas laisser le silence s'installer.
 */
const COQUILLES = [
  /^placeholder\d*$/i,
  /^Complète la phrase\b/i,
  /^Complete the (?:sentence|key claim|statement)\b/i,
  /^Complète l'affirmation\b/i,
];

function estCoquille(texte: string): boolean {
  return COQUILLES.some((r) => r.test(texte.trim()));
}

function controlerCoquille(variant: VariantAControler): Manquement[] {
  // Pour un CLOZE, ce qui s'affiche c'est `cloze.sentence` (l'écran de
  // révision ignore `question`). On regarde donc la charge quand elle est
  // là — c'est elle qui doit porter la vraie question. Un cloze absent est
  // déjà signalé par `controlerCloze`.
  if (variant.format === "CLOZE") {
    if (!variant.cloze) return [];
    if (!estCoquille(variant.cloze.sentence)) return [];
    return [
      {
        regle: "question coquille",
        detail: `charge d'un CLOZE qui ne porte pas la phrase à trou : « ${variant.cloze.sentence.slice(0, 80)} »`,
      },
    ];
  }

  if (!estCoquille(variant.question)) return [];

  return [
    {
      regle: "question coquille",
      detail: `texte de question qui ne porte pas la question réelle : « ${variant.question.slice(0, 80)} »`,
    },
  ];
}

/**
 * La question qui renvoie à un texte que personne ne voit.
 *
 * L'écran de révision ne montre jamais le concept — l'afficher donnerait la
 * réponse avec l'exercice —, donc « mentionné dans le concept » désigne le vide.
 * Il ne reste au lecteur que deux étiquettes en petites capitales au-dessus de la
 * carte, et rien ne dit qu'elles sont ce à quoi la question renvoie.
 *
 * On lit ce qui **s'affiche** : la phrase trouée pour un texte à trou, le champ
 * `question` partout ailleurs. C'est la même distinction que pour les coquilles,
 * et pour la même raison — le `question` d'un CLOZE ne va nulle part.
 *
 * Signalé, jamais refusé : la question est maladroite, pas fausse, et jeter un
 * appel qui porte trois concepts pour une tournure coûterait plus que le défaut.
 * La correction vit dans le prompt ; ce contrôle dit si elle prend.
 */
function controlerRenvoi(variant: VariantAControler): Manquement[] {
  const affiche = variant.format === "CLOZE" ? (variant.cloze?.sentence ?? "") : variant.question;
  const renvoi = renvoiAuConcept(affiche);

  if (!renvoi) return [];

  return [
    {
      regle: "renvoi au concept",
      detail: `la question renvoie à « ${renvoi} », qu'on ne montre pas`,
    },
  ];
}

/** Tout ce qu'on peut reprocher à une question sans regarder les autres. */
export function controlerQuestion(variant: VariantAControler): Manquement[] {
  return [
    ...controlerMcq(variant),
    ...controlerCloze(variant),
    ...controlerVraiOuFaux(variant),
    ...controlerCharge(variant),
    ...controlerCoquille(variant),
    ...controlerRenvoi(variant),
    ...controlerReponseCachee(variant),
  ];
}
