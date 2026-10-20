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
 * Une clé par facette, pour qu'elle ne puisse être ni répétée, ni omise, ni
 * inventée ; chaque concept est désigné par son rang dans l'envoi. La validation
 * ne rejette jamais l'envoi, trop cher : ce qui dépasse se tronque, un lot
 * inservable disparaît seul et son rang remonte à l'appelant.
 */

/** Au-delà, la sortie frôlerait `max_tokens`. */
export const CONCEPTS_PAR_APPEL = 3;

const FORMES_ACCEPTEES_MAXIMUM = 8;

/** Trois leurres et la bonne réponse font quatre pistes ; le reste ne se montre pas. */
const LEURRES_MAXIMUM = 3;

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
 * L'emplacement du trou passe par la grammaire (la facette désignée n'ouvre que
 * `CLOZE`), pas par une consigne. `lotLu` l'ignore, `CLOZE` étant légitime partout.
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

/** Relu : plus de borne de comptage, les énumérations restent. */
const lotLu = z.object({
  rang: z.number().int(),
  recognition: questionLue(FORMATS_VERIFIABLES),
  mechanism: questionLue(FORMATS_DU_MECANISME),
  boundary: questionLue(FORMATS_VERIFIABLES),
  application: questionLue(FORMATS_VERIFIABLES),
});

const sortieLue = z.object({ lots: z.array(lotLu).min(1) });

/** L'ordre servi. */
const FACETTES = [
  ["recognition", "RECOGNITION"],
  ["mechanism", "MECHANISM"],
  ["boundary", "BOUNDARY"],
  ["application", "APPLICATION"],
] as const;

type QuestionLue = z.infer<typeof lotLu>["recognition"];

/**
 * Une charge au mauvais format est ignorée, pas refusée (l'appel est payé) ;
 * `chargeIgnoree` la signale au contrôle pour que le défaut ne passe pas en silence.
 */
function chargesDe(posee: QuestionLue) {
  const mcq = posee.format === "MCQ" ? (posee.mcq ?? null) : null;
  const cloze = posee.format === "CLOZE" ? (posee.cloze ?? null) : null;
  const enTrop = (posee.mcq ?? null) !== null || (posee.cloze ?? null) !== null;

  return { mcq, cloze, chargeIgnoree: enTrop && mcq === null && cloze === null };
}

/**
 * Servie, elle noterait faux quelqu'un qui a raison ou montrerait une carte vide.
 * C'est le vide, pas une longueur hors bornes : texte sans lettre ni chiffre (le
 * modèle abrège parfois un lot en « ... »), QCM indistinguable ou sans bonne
 * réponse, phrase à trou sans trou.
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

function optionsDe(posee: QuestionLue) {
  const { mcq } = chargesDe(posee);
  const normalisees = mcq ? normaliserLesOptions(mcq.options, mcq.correctIndex) : null;

  return {
    options: normalisees?.options ?? null,
    correctIndex: normalisees?.correctIndex ?? null,
  };
}

const validationDeGeneration = sortieLue.transform((sortie) => {
  // Deux lots au même rang : le premier gagne, refuser emporterait les autres.
  const vus = new Set<number>();
  const uniques = sortie.lots.filter((entree) => {
    if (vus.has(entree.rang)) return false;

    vus.add(entree.rang);

    return true;
  });

  const servables = uniques.filter((entree) =>
    FACETTES.every(([cle]) => !inexploitable(entree[cle])),
  );

  // Sans ce compte, un rang écarté ici et un rang jamais rendu font le même silence.
  const ecartes = uniques
    .filter((entree) => !servables.includes(entree))
    .map((entree) => entree.rang);

  return {
    ecartes,
    lots: servables.map((entree) => ({
      rang: entree.rang,
      variants: FACETTES.map(([cle, facet]) => {
        const { cloze, chargeIgnoree } = chargesDe(entree[cle]);
        // Le `question` d'un CLOZE ne s'affiche pas et le modèle y met souvent un
        // « placeholder » : dérivé de la phrase, aucune coquille ne va en base.
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

/** `purpose` ne dépend pas du trou : même registre, même fixture en mode mock. */
export function contratDeGeneration(trou?: FacetteDuLot): ContratDeSortie<SortieDeGeneration> {
  return {
    purpose: "generate_variants",
    forme: formeDeLEnvoi(trou),
    validation: validationDeGeneration,
  };
}

/** Sans trou imposé, pour les tests et les fixtures. */
export const CONTRAT_DE_GENERATION = contratDeGeneration();
