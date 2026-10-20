import { z } from "zod";
import { VariantFormat } from "@/lib/db/types";
import { TROU } from "@/lib/domain/reponse-cloze";

/**
 * La forme d'une question, d'où se compile la grammaire du décodage contraint.
 * Les bornes chiffrées n'y sont que des indications (versées en description par
 * `lib/ai/schema-de-sortie.ts`) : à la relecture, elles jetteraient un appel payé
 * qui porte trois concepts. La relecture ne garde que ce que la grammaire tient,
 * les énumérations et `minItems` à 0 ou 1.
 */

/** Une clé facultative plutôt que deux champs à annuler. */
function mcq() {
  return z.object({
    options: z
      .array(z.string().min(1).max(300))
      .length(4)
      .describe("Les quatre options, de longueur comparable."),
    correctIndex: z.number().int().min(0).max(3).describe("L'index de la bonne option."),
  });
}

/** Relu : le compte des options est rattrapé, pas exigé. */
function mcqLu() {
  return z.object({
    options: z.array(z.string()),
    correctIndex: z.number().int(),
  });
}

/** Relu. `min(1)` reste : la grammaire le tient. */
function clozeLu() {
  return z.object({
    sentence: z.string(),
    accepted: z.array(z.string()).min(1),
    // Facultatifs à la relecture : des questions en base n'en portent pas et
    // restent servables.
    leurres: z.array(z.string()).nullish(),
  });
}

/**
 * De quoi vérifier la saisie sans rappeler le modèle (`lib/domain/reponse-cloze.ts`).
 * Le terme masqué vient en premier : on le montre en cas d'erreur et on en mesure
 * la longueur. Les leurres se demandent au même appel, sans quoi le coup de pouce
 * coûterait un appel pendant la session.
 */
function cloze() {
  return z.object({
    sentence: z
      .string()
      .min(10)
      .max(600)
      .describe(`La phrase du concept, le terme masqué remplacé par ${TROU}.`),
    accepted: z
      .array(z.string().min(1).max(120))
      .min(1)
      .max(8)
      .describe("Les formes acceptées, le terme masqué d'abord, puis ses variantes."),
    leurres: z
      .array(z.string().min(1).max(120))
      .length(3)
      .describe(
        "Trois termes faux, de même nature et de même longueur que le terme masqué, qu'on pourrait hésiter à mettre à sa place.",
      ),
  });
}

/** Une instance neuve à chaque appel : partagée, elle partirait dans `$defs`. */
function enonce() {
  return z.string().min(10).max(800);
}

function reponseAttendue(description: string) {
  return z.string().min(1).max(2000).describe(description);
}

/**
 * « Au plus une question à s'auto-noter » est tenu par la grammaire : en
 * consigne, le modèle ne le respectait pas hors informatique. Seul `MECHANISM`
 * ouvre le texte libre, où « explique pourquoi » vaut mieux qu'un choix à cocher.
 */
export const FORMATS_VERIFIABLES = [
  "MCQ",
  "TRUE_FALSE",
  "CLOZE",
  "CODE",
] as const satisfies readonly VariantFormat[];

export const FORMATS_DU_MECANISME = [
  "EXPLAIN",
  "CLOZE",
  "MCQ",
  "CODE",
  "SHORT_ANSWER",
] as const satisfies readonly VariantFormat[];

/**
 * `z.enum()` est appelé une fois par facette, jamais partagé : Zod extrait une
 * instance réutilisée vers `$defs`, où la contrainte devient une description que
 * le décodage n'applique plus.
 */
export function question(formats: readonly [VariantFormat, ...VariantFormat[]], facette: string) {
  return z
    .object({
      format: z.enum(formats),
      question: enonce(),
      answerKey: reponseAttendue(
        "La réponse attendue en clair. Pour SHORT_ANSWER et EXPLAIN, de quoi se juger.",
      ),
      mcq: mcq().nullish().describe("À renseigner si et seulement si format vaut MCQ."),
      cloze: cloze().nullish().describe("À renseigner si et seulement si format vaut CLOZE."),
      estVraie: z
        .boolean()
        .nullish()
        .describe(
          "À renseigner si et seulement si format vaut TRUE_FALSE. Vrai si l'affirmation posée est vraie. L'envoi impose la valeur attendue pour cette facette.",
        ),
    })
    .describe(facette);
}

/**
 * Le texte à trou imposé par le serveur. Énumération à une valeur et charge
 * requise, que la grammaire tient (une consigne ne suffisait pas) ; `mcq` et
 * `estVraie` sont absents pour qu'aucun autre format ne revienne.
 */
export function questionATrou(facette: string) {
  return z
    .object({
      format: z.enum(["CLOZE"]),
      question: enonce(),
      answerKey: reponseAttendue(
        "Ce qu'il fallait avoir compris pour trouver le terme masqué. Ne le réannonce pas : il s'affiche dans la phrase au moment où ce texte est lu.",
      ),
      cloze: cloze(),
    })
    .describe(facette);
}

/**
 * Relue : l'énumération reste (elle garantit la règle des facettes), les
 * longueurs partent, une question hors bornes ne valant pas trois lots perdus.
 * `estVraie` omise ou contraire à la cible est un manquement au contrôle, pas un
 * refus.
 */
export function questionLue(formats: readonly [VariantFormat, ...VariantFormat[]]) {
  return z.object({
    format: z.enum(formats),
    question: z.string(),
    answerKey: z.string(),
    mcq: mcqLu().nullish(),
    cloze: clozeLu().nullish(),
    estVraie: z.boolean().nullish(),
  });
}
