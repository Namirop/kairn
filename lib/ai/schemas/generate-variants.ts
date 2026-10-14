import { z } from "zod";
import type { FacetteDuLot } from "@/lib/domain/emplacement-du-trou";
import { normaliserLesOptions, optionsDistinguables } from "@/lib/domain/options-de-qcm";
import { questionServable } from "@/lib/domain/question-servable";
import { TROU } from "@/lib/domain/reponse-cloze";
import type { ContratDeSortie } from "./contrat-de-sortie";
import {
  FORMATS_DU_MECANISME,
  FORMATS_VERIFIABLES,
  question,
  questionATrou,
  questionLue,
} from "./generate-variants-question";

/**
 * Quatre clés nommées par concept, plusieurs concepts par appel, chacun désigné
 * par son rang dans l'envoi. La facette est le nom de la clé : elle ne peut être
 * ni répétée, ni omise, ni inventée.
 *
 * La validation ne rejette jamais l'envoi : un appel qui porte trois concepts
 * est trop cher pour être jeté. Ce qui dépasse se tronque ; ce qu'on ne sait pas
 * servir fait disparaître son lot seul, et le rang manquant remonte à
 * l'appelant.
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
 * La forme d'un envoi, avec l'emplacement du texte à trou déjà décidé : il passe
 * par la grammaire (la facette désignée n'ouvre que `CLOZE`), pas par une
 * consigne. `lotLu` n'a pas à le connaître, `CLOZE` étant légitime partout.
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

export const formeDeGeneration = formeDeLEnvoi(undefined);

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
 * Une charge au mauvais format est ignorée, jamais refusée : rien de ce qui se
 * relit ne fait échouer un appel déjà payé. `chargeIgnoree` la signale tout de
 * même au contrôle, pour que le défaut ne soit pas rattrapé en silence.
 */
function chargesDe(posee: QuestionLue) {
  const mcq = posee.format === "MCQ" ? (posee.mcq ?? null) : null;
  const cloze = posee.format === "CLOZE" ? (posee.cloze ?? null) : null;
  const enTrop = (posee.mcq ?? null) !== null || (posee.cloze ?? null) !== null;

  return { mcq, cloze, chargeIgnoree: enTrop && mcq === null && cloze === null };
}

/**
 * Une question qu'on ne saurait pas servir : la servir noterait faux quelqu'un
 * qui a raison, ou montrerait une carte vide.
 *
 * C'est le vide sous toutes ses formes, pas une longueur hors bornes (la
 * relecture n'en a plus, à dessein) : texte ou réponse sans lettre ni chiffre
 * (le modèle abrège parfois un lot en « ... » sans être tronqué), QCM aux options
 * indistinguables ou dont la bonne réponse ne désigne rien, phrase à trou sans
 * trou. Seul le lot concerné disparaît.
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

const validationDeGeneration = sortieLue.transform((sortie) => {
  // Deux lots au même rang : le premier gagne. Refuser emporterait les lots
  // corrects du même envoi.
  const vus = new Set<number>();
  const uniques = sortie.lots.filter((entree) => {
    if (vus.has(entree.rang)) return false;

    vus.add(entree.rang);

    return true;
  });

  const servables = uniques.filter((entree) =>
    FACETTES.every(([cle]) => !inexploitable(entree[cle])),
  );

  // Les rangs retirés par la relecture, distingués de ceux que le modèle n'a
  // jamais rendus : sans ce compte, les deux causes produisent le même silence.
  const ecartes = uniques
    .filter((entree) => !servables.includes(entree))
    .map((entree) => entree.rang);

  return {
    ecartes,
    lots: servables.map((entree) => ({
      rang: entree.rang,
      variants: FACETTES.map(([cle, facet]) => {
        const { cloze, chargeIgnoree } = chargesDe(entree[cle]);
        // L'écran n'affiche jamais le champ `question` d'un CLOZE, et le modèle y
        // écrit souvent une consigne générique ou un « placeholder ». On le
        // dérive de la phrase pour qu'aucune coquille n'aille en base.
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

export type SortieDeGeneration = z.infer<typeof validationDeGeneration>;

/**
 * Le contrat d'un envoi, avec l'emplacement du trou qui lui a été assigné.
 * `purpose` reste le même quel que soit le trou : même dépense, même registre,
 * même fixture en mode mock.
 */
export function contratDeGeneration(trou?: FacetteDuLot): ContratDeSortie<SortieDeGeneration> {
  return {
    purpose: "generate_variants",
    forme: formeDeLEnvoi(trou),
    validation: validationDeGeneration,
  };
}

/** Le contrat sans emplacement imposé : les tests et les fixtures s'en servent. */
export const CONTRAT_DE_GENERATION = contratDeGeneration();
