import { z } from "zod";
import { VariantFormat } from "@/lib/db/types";
import { TROU } from "@/lib/domain/reponse-cloze";

/**
 * La forme d'une question, et ce que chaque format lui ajoute.
 *
 * C'est ce que le modèle voit : la grammaire du décodage contraint est compilée
 * depuis ces objets. Ce qui s'y trouve est imposé ; ce qui n'y est pas se
 * vérifie après coup, dans la validation du lot.
 *
 * **Sauf les bornes chiffrées, qui ne sont imposées par rien.** Longueurs,
 * minimums, maximums partent en description (`lib/ai/output-schema.ts`) : le
 * modèle les lit comme des indications. Elles vivent donc dans la forme, où
 * elles cadrent la sortie, et pas dans la relecture, où elles ne feraient que
 * jeter un appel déjà payé. Un appel de questions coûte plus cher qu'une
 * extraction, et il en porte trois concepts à la fois.
 *
 * Ce qui reste une règle à la relecture : les énumérations, que la grammaire
 * tient réellement, et `minItems` à 0 ou 1, seul mot-clé de comptage recopié.
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
  return z.object({ sentence: z.string(), accepted: z.array(z.string()).min(1) });
}

/**
 * Ce qu'un CLOZE ajoute : la phrase trouée, et de quoi vérifier la saisie sans
 * rappeler le modèle.
 *
 * La tolérance se paie ici, une fois, à la génération. La comparaison, elle,
 * vit dans `lib/domain/reponse-cloze.ts` : instantanée et gratuite à chaque
 * passage. Le terme masqué vient en premier — c'est celui qu'on montre quand la
 * réponse ne correspond pas, et celui dont on mesure la longueur.
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
  });
}

/**
 * Les formats ouverts à chaque facette.
 *
 * Le quota « au plus une question à s'auto-noter » est une propriété de la
 * grammaire, pas une consigne que le modèle aurait à compter : trois facettes
 * sur quatre n'offrent aucun format en texte libre, donc le décodage contraint
 * ne peut pas produire un lot qui déborde.
 *
 * Le banc a montré pourquoi la consigne seule ne suffisait pas. Sur le corpus
 * technique, `CODE` occupait un tiers des emplacements `APPLICATION` et le quota
 * tenait ; hors informatique, `CODE` disparaît, `APPLICATION` retombe sur
 * `SHORT_ANSWER`, `MECHANISM` reste sur `EXPLAIN`, et plus d'un lot sur deux
 * repassait à deux questions jugées par l'utilisateur. La règle ne tenait que
 * grâce à une béquille qui n'existe pas là où va le produit.
 *
 * `MECHANISM` garde le texte libre : « explique pourquoi » vaut souvent mieux
 * qu'un choix à cocher, et une seule question de ce genre ne fatigue personne.
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
 * Une énumération à une seule valeur et une charge **requise** : ce sont les
 * deux mots-clés que la grammaire tient réellement (`enum`, `required`), donc le
 * modèle ne peut ni choisir un autre format, ni omettre la phrase trouée. La
 * consigne « une des quatre questions au moins est un CLOZE » n'existe plus dans
 * le prompt — elle a tenu jusqu'à ce qu'une autre consigne tire dans l'autre
 * sens, et 41 lots sur 80 se sont retrouvés sans aucun trou.
 *
 * Ni `mcq` ni `estVraie` n'y figurent : la clé absente de la forme ne peut pas
 * revenir.
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
        .describe("Le terme masqué, en clair, et ce qu'il fallait avoir compris pour le trouver."),
      cloze: cloze(),
    })
    .describe(facette);
}

/**
 * La même question, relue.
 *
 * L'énumération des formats reste, et c'est délibéré : c'est elle qui rend la
 * règle des facettes réellement intenable plutôt que recommandée, et la
 * grammaire la fait respecter. Les longueurs, elles, sont parties — une question
 * de neuf caractères ou de mille reste lisible, se voit au banc, et ne vaut pas
 * de perdre trois lots.
 *
 * `z.enum()` est appelé ici aussi à chaque invocation, pour la même raison qu'au
 * dessus : une instance partagée partirait en `$defs`.
 *
 * `estVraie` se relit sans aucune contrainte croisée, contrairement à `mcq` et
 * `cloze` : un `TRUE_FALSE` qui ne l'aurait pas renseigné, ou qui aurait rendu
 * l'inverse de la cible demandée, lève un **manquement** au contrôle et pas un
 * refus. La question reste servable — elle est juste comptée du mauvais côté —,
 * et jeter un appel qui porte trois concepts pour ça coûterait bien plus que le
 * défaut mesuré.
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
