import { z } from "zod";
import type { FacetteDuLot } from "@/lib/domain/emplacement-du-trou";
import { normaliserLesOptions, optionsDistinguables } from "@/lib/domain/options-de-qcm";
import { questionServable } from "@/lib/domain/question-servable";
import { TROU } from "@/lib/domain/reponse-cloze";
import type { AiContract } from "./contract";
import {
  FORMATS_DU_MECANISME,
  FORMATS_VERIFIABLES,
  question,
  questionATrou,
  questionLue,
} from "./generate-variants-question";

/**
 * Quatre clés nommées par concept, et plusieurs concepts par appel.
 *
 * La facette est le nom de la clé : elle ne peut être ni répétée, ni omise, ni
 * inventée, et l'énumération des facettes disparaît du schéma. Le tableau, lui,
 * ne porte plus que le groupement — un concept par entrée, désigné par son
 * rang, celui de l'envoi.
 *
 * La validation rend un lot par concept, questions à plat dans l'ordre des
 * facettes : c'est la forme sous laquelle le reste du projet lit une
 * génération.
 *
 * **Elle ne rejette plus rien du tout.** Un lot de trop, une option de trop, une
 * forme acceptée de trop, une charge jointe au mauvais format : tout ça se
 * rattrape. Ce qu'on ne sait pas servir fait disparaître son lot, seul, et le
 * rang manquant remonte à l'appelant — les deux autres concepts du même appel
 * sont écrits. Un appel qui porte trois concepts est trop cher pour être jeté.
 */

/** Concepts traités en un appel. Au-delà, la sortie frôlerait `max_tokens`. */
export const CONCEPTS_PAR_APPEL = 3;

/** Assez de variantes pour accepter une réponse ; au-delà, on n'en lit plus. */
const FORMES_ACCEPTEES_MAXIMUM = 8;

/** Trois leurres suffisent à quatre pistes ; le reste ne se montrerait pas. */
const LEURRES_MAXIMUM = 3;

/** Ce que chaque facette demande, et les formats qu'elle ouvre. */
const FACETTE = {
  recognition: {
    formats: FORMATS_VERIFIABLES,
    consigne: "De quoi s'agit-il, comment le nommerait-on, à quoi le reconnaît-on.",
  },
  mechanism: {
    formats: FORMATS_DU_MECANISME,
    consigne: "Pourquoi ça marche, ce qui se passe réellement, dans quel ordre.",
  },
  boundary: {
    formats: FORMATS_VERIFIABLES,
    consigne: "Ce que ce n'est pas, quand ça ne s'applique pas, la confusion classique.",
  },
  application: {
    formats: FORMATS_VERIFIABLES,
    consigne: "S'en servir dans une situation concrète qui n'est pas celle du concept.",
  },
} as const satisfies Record<FacetteDuLot, unknown>;

/**
 * La forme d'un envoi, avec l'emplacement du texte à trou déjà décidé.
 *
 * C'est la seule partie du contrat qui varie d'un appel à l'autre, et elle varie
 * par la grammaire plutôt que par une phrase : la facette désignée n'ouvre que
 * `CLOZE` et exige sa charge. La relecture, elle, ne bouge pas — `CLOZE` est un
 * format légitime pour les quatre facettes, donc `lotLu` la lit sans rien savoir
 * de l'emplacement choisi.
 */
function formeDuLot(trou: FacetteDuLot | undefined) {
  const champ = (facette: FacetteDuLot) =>
    facette === trou
      ? questionATrou(FACETTE[facette].consigne)
      : question(FACETTE[facette].formats, FACETTE[facette].consigne);

  return z.object({
    rang: z
      .number()
      .int()
      .min(1)
      .max(CONCEPTS_PAR_APPEL)
      .describe("Le numéro du concept traité, tel qu'il est donné dans l'envoi."),
    recognition: champ("recognition"),
    mechanism: champ("mechanism"),
    boundary: champ("boundary"),
    application: champ("application"),
  });
}

function formeDeLEnvoi(trou: FacetteDuLot | undefined) {
  return z.object({
    lots: z
      .array(formeDuLot(trou))
      .min(1)
      .max(CONCEPTS_PAR_APPEL)
      .describe("Un lot de quatre questions par concept reçu, un rang par concept."),
  });
}

export const generateVariantsForme = formeDeLEnvoi(undefined);

/** Le même lot, relu : plus aucune borne de comptage, les énumérations restent. */
const lotLu = z.object({
  rang: z.number().int(),
  recognition: questionLue(FORMATS_VERIFIABLES),
  mechanism: questionLue(FORMATS_DU_MECANISME),
  boundary: questionLue(FORMATS_VERIFIABLES),
  application: questionLue(FORMATS_VERIFIABLES),
});

const sortieLue = z.object({ lots: z.array(lotLu).min(1) });

/** L'ordre servi, et la facette que porte chaque clé. */
const FACETTES = [
  ["recognition", "RECOGNITION"],
  ["mechanism", "MECHANISM"],
  ["boundary", "BOUNDARY"],
  ["application", "APPLICATION"],
] as const;

type QuestionLue = z.infer<typeof lotLu>["recognition"];

/**
 * La charge d'une question, quand elle correspond au format déclaré.
 *
 * Une charge qui ne correspond pas est **ignorée**, jamais refusée : sur
 * `18-anglais`, le modèle a joint une phrase trouée à une question qui n'était
 * pas un texte à trou, et l'envoi entier — trois concepts, appel payé — a été
 * jeté pour ce seul champ en trop. C'est la classe de `.max(12)`, et la règle
 * est la même : rien de ce qui se relit ne fait échouer un appel déjà payé.
 *
 * Elle est ignorée mais pas oubliée : `chargeIgnoree` la signale au contrôle,
 * qui en fait un manquement. Un défaut silencieusement rattrapé est un défaut
 * qu'on ne corrige jamais.
 */
function chargesDe(posee: QuestionLue) {
  const mcq = posee.format === "MCQ" ? (posee.mcq ?? null) : null;
  const cloze = posee.format === "CLOZE" ? (posee.cloze ?? null) : null;
  const enTrop = (posee.mcq ?? null) !== null || (posee.cloze ?? null) !== null;

  return { mcq, cloze, chargeIgnoree: enTrop && mcq === null && cloze === null };
}

/**
 * Une question qu'on ne saurait pas servir, et le seul motif qui coûte encore
 * quelque chose.
 *
 * Un QCM sans options, ou dont la bonne réponse ne désigne aucune option, et un
 * texte à trou sans phrase trouée : la donnée est inexploitable, pas seulement
 * hors bornes. Servir la question reviendrait à noter faux quelqu'un qui a
 * raison, ou à montrer un trou vide.
 *
 * **Une question sans texte, ou sans réponse, en fait partie — et c'est le cas
 * qui est passé en production.** La relecture a laissé tomber toutes ses bornes
 * de longueur, à raison : « une question de neuf caractères reste lisible, se
 * voit au banc, et ne vaut pas de perdre trois lots ». Elle a laissé tomber le
 * minimum avec elles, et une question de **zéro** caractère, elle, ne se lit
 * pas : elle sert une carte vide, sous laquelle « Voir la réponse » n'affiche
 * rien non plus. C'est ce qu'un compte a eu sous les yeux le 28/08, sur un
 * concept qui n'avait plus qu'à être supprimé.
 *
 * Le blanc n'est pas une longueur hors bornes, c'est l'absence de la chose. On
 * le range donc ici, avec le QCM sans options, et non dans les bornes qu'on a
 * eu raison de retirer.
 *
 * **Et le blanc n'est pas le seul vide : le 23/09, un lot est arrivé abrégé.**
 * Le modèle a écrit la première question du concept, puis posé « ... » partout
 * ailleurs — énoncé, étalon, phrase trouée, quatre options. Trois points ne
 * sont pas une chaîne vide, l'appel n'a pas été tronqué (3 194 jetons de sortie
 * sur 10 000 autorisés) et la grammaire était satisfaite : le lot est passé, et
 * une carte portant « ... » a été servie en session. Les trois conditions
 * ajoutées disent la même chose que le blanc, sous les trois formes où le vide
 * peut se présenter — un texte sans lettre ni chiffre, une phrase à trou sans
 * trou, des options qu'on ne peut pas distinguer les unes des autres.
 *
 * Ça ne fait pas tomber l'envoi pour autant : c'est le **lot** qui disparaît,
 * et son rang manquant est rapporté par l'appelant. Les deux autres concepts du
 * même appel sont écrits.
 */
function inexploitable(posee: QuestionLue): boolean {
  const { mcq, cloze } = chargesDe(posee);

  if (!questionServable(posee)) return true;

  if (posee.format === "MCQ") {
    return (
      mcq === null ||
      !optionsDistinguables(mcq.options) ||
      normaliserLesOptions(mcq.options, mcq.correctIndex) === null
    );
  }

  return posee.format === "CLOZE" && (cloze === null || !cloze.sentence.includes(TROU));
}

/** Les options d'un QCM, ramenées à un jeu utilisable. */
function optionsDe(posee: QuestionLue) {
  const { mcq } = chargesDe(posee);
  const normalisees = mcq ? normaliserLesOptions(mcq.options, mcq.correctIndex) : null;

  return {
    options: normalisees?.options ?? null,
    correctIndex: normalisees?.correctIndex ?? null,
  };
}

const generateVariantsValidation = sortieLue.transform((sortie) => {
  // Deux lots au même rang ne se refusent plus : le premier gagne, et les
  // rangs restés sans réponse sont signalés par l'appelant. Refuser aurait
  // emporté les lots corrects du même envoi.
  const vus = new Set<number>();
  const uniques = sortie.lots.filter((entree) => {
    if (vus.has(entree.rang)) return false;

    vus.add(entree.rang);

    return true;
  });

  // Plus aucune validation croisée ne peut faire tomber l'envoi. Le lot qui
  // porte une question inexploitable disparaît seul, et son rang manquant
  // remonte à l'appelant, qui le rapporte concept par concept.
  const servables = uniques.filter((entree) =>
    FACETTES.every(([cle]) => !inexploitable(entree[cle])),
  );

  // Les rangs que *nous* avons retirés, distingués de ceux que le modèle n'a
  // jamais rendus. Sans ce compte, une relecture trop sévère et un modèle
  // avare produisent exactement le même silence, et on ne saurait pas lequel
  // des deux on regarde.
  const ecartes = uniques
    .filter((entree) => !servables.includes(entree))
    .map((entree) => entree.rang);

  return {
    ecartes,
    lots: servables.map((entree) => ({
      rang: entree.rang,
      variants: FACETTES.map(([cle, facet]) => {
        const { cloze, chargeIgnoree } = chargesDe(entree[cle]);
        // Le champ `question` d'un CLOZE ne sert à rien : l'écran de révision
        // affiche `cloze.sentence`, jamais la question. Le modèle y écrit donc
        // au mieux une consigne générique (« Complète la phrase du concept. »),
        // au pire un vrai « placeholder » — visible dans le figé du 18/08,
        // 71 CLOZE sur 192 en portaient une coquille. On dérive le champ à la
        // source pour que rien de pourri ne file en base, dans le figé, ou dans
        // la mesure du radotage.
        const questionDerivee =
          entree[cle].format === "CLOZE" && cloze ? cloze.sentence : entree[cle].question;

        return {
          format: entree[cle].format,
          facet,
          question: questionDerivee,
          answerKey: entree[cle].answerKey,
          estVraie: entree[cle].estVraie ?? null,
          chargeIgnoree,
          ...optionsDe(entree[cle]),
          cloze: cloze
            ? {
                sentence: cloze.sentence,
                accepted: cloze.accepted.slice(0, FORMES_ACCEPTEES_MAXIMUM),
                leurres: (cloze.leurres ?? []).slice(0, LEURRES_MAXIMUM),
              }
            : null,
        };
      }),
    })),
  };
});

export type GenerateVariantsOutput = z.infer<typeof generateVariantsValidation>;

/**
 * Le contrat d'un envoi, avec l'emplacement du trou qui lui a été assigné.
 *
 * `purpose` ne change pas : c'est la même dépense, le même registre, la même
 * fixture en mode mock. Seule la grammaire montrée au modèle diffère.
 */
export function contratDeGeneration(trou?: FacetteDuLot): AiContract<GenerateVariantsOutput> {
  return {
    purpose: "generate_variants",
    forme: formeDeLEnvoi(trou),
    validation: generateVariantsValidation,
  };
}

/** Le contrat sans emplacement imposé : les tests et les fixtures s'en servent. */
export const GENERATE_VARIANTS = contratDeGeneration();
