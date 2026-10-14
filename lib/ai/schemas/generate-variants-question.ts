import { z } from "zod";
import { VariantFormat } from "@/lib/db/types";
import { TROU } from "@/lib/domain/reponse-cloze";

/**
 * La forme d'une question, et ce que chaque format lui ajoute. La grammaire du
 * décodage contraint est compilée depuis ces objets.
 *
 * Les bornes chiffrées n'y sont pas imposées : elles partent en description
 * (`lib/ai/output-schema.ts`) et le modèle les lit comme des indications. Elles
 * vivent donc dans la forme et pas dans la relecture, où elles ne feraient que
 * jeter un appel payé qui porte trois concepts. La relecture ne garde que ce que
 * la grammaire tient : les énumérations, et `minItems` à 0 ou 1.
 */

/** Ce qu'un MCQ ajoute. Une clé facultative plutôt que deux champs à annuler. */
function mcq() {
  return z.object({
    options: z
      .array(z.string().min(1).max(300))
      .length(4)
      .describe("Les quatre options, de longueur comparable."),
    correctIndex: z.number().int().min(0).max(3).describe("L'index de la bonne option."),
  });
}

/** Le même MCQ, relu : le compte des options est rattrapé, pas exigé. */
function mcqLu() {
  return z.object({
    options: z.array(z.string()),
    correctIndex: z.number().int(),
  });
}

/** Le même texte à trou, relu. `min(1)` tient : la grammaire le recopie. */
function clozeLu() {
  return z.object({
    sentence: z.string(),
    accepted: z.array(z.string()).min(1),
    // Facultatifs à la relecture, imposés à l'écriture : des questions en base
    // n'en portent pas, et elles restent servables.
    leurres: z.array(z.string()).nullish(),
  });
}

/**
 * Ce qu'un CLOZE ajoute : la phrase trouée, et de quoi vérifier la saisie sans
 * rappeler le modèle.
 *
 * La comparaison vit dans `lib/domain/reponse-cloze.ts`. Le terme masqué vient
 * en premier : c'est celui qu'on montre en cas d'erreur, et celui dont on mesure
 * la longueur.
 *
 * Les leurres (le coup de pouce de la révision) se demandent au même appel : les
 * fabriquer plus tard voudrait dire un appel modèle pendant une session.
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

/**
 * Les formats ouverts à chaque facette.
 *
 * Le quota « au plus une question à s'auto-noter » est tenu par la grammaire,
 * pas par une consigne (que le modèle ne respectait pas hors informatique) :
 * seul `MECHANISM` ouvre le texte libre, parce que « explique pourquoi » vaut
 * souvent mieux qu'un choix à cocher.
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
 * `z.enum()` est appelé ici, une fois par facette, et jamais partagé : Zod
 * extrait vers `$defs` dès qu'une même instance de schéma est réutilisée, et la
 * contrainte y devient une description que le décodage n'applique plus.
 */
export function question(formats: readonly [VariantFormat, ...VariantFormat[]], facette: string) {
  return z
    .object({
      format: z.enum(formats),
      question: z.string().min(10).max(800),
      answerKey: z
        .string()
        .min(1)
        .max(2000)
        .describe("La réponse attendue en clair. Pour SHORT_ANSWER et EXPLAIN, de quoi se juger."),
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
 * La question dont le serveur a décidé qu'elle serait un texte à trou.
 *
 * Une énumération à une valeur et une charge requise, deux mots-clés que la
 * grammaire tient réellement : le modèle ne peut ni changer de format ni omettre
 * la phrase trouée. Une consigne dans le prompt ne suffisait pas. `mcq` et
 * `estVraie` sont absents pour ne pas pouvoir revenir.
 */
export function questionATrou(facette: string) {
  return z
    .object({
      format: z.enum(["CLOZE"]),
      question: z.string().min(10).max(800),
      answerKey: z
        .string()
        .min(1)
        .max(2000)
        .describe(
          "Ce qu'il fallait avoir compris pour trouver le terme masqué. Ne le réannonce pas : il s'affiche dans la phrase au moment où ce texte est lu.",
        ),
      cloze: cloze(),
    })
    .describe(facette);
}

/**
 * La même question, relue. L'énumération des formats reste (la grammaire la
 * tient, c'est elle qui garantit la règle des facettes) ; les longueurs partent :
 * une question trop courte ou trop longue reste lisible et ne vaut pas de perdre
 * trois lots. `z.enum()` est appelé à chaque invocation, comme dans `question`.
 *
 * `estVraie` se relit sans contrainte : un `TRUE_FALSE` qui l'omet ou rend
 * l'inverse de la cible lève un manquement au contrôle, pas un refus. La
 * question reste servable.
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
