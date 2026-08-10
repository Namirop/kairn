import { prisma } from "@/lib/db/client";
import { creerJobsDeQuestions } from "@/lib/db/lots";
import { effacerQuestions } from "@/lib/db/variants";
import type { AtomState, InputStatus, VariantFacet, VariantFormat } from "@/lib/db/types";

/**
 * Lecture et correction d'un concept.
 *
 * Toute écriture passe par l'identifiant du propriétaire : un concept qui n'est
 * pas à l'utilisateur n'est pas trouvé, donc pas touché. Le `userId` ne vient
 * jamais du client.
 */

export type QuestionLue = {
  id: string;
  format: VariantFormat;
  facet: VariantFacet;
  question: string;
  answerKey: string;
};

export type ConceptLu = {
  id: string;
  concept: string;
  tags: string[];
  uncertain: boolean;
  state: AtomState;
  questions: QuestionLue[];
};

export type DepotDetaille = {
  id: string;
  rawContent: string;
  extractedText: string | null;
  status: InputStatus;
  failureReason: string | null;
  createdAt: Date;
  concepts: ConceptLu[];
  /** Travaux encore en cours ou en attente sur ce dépôt. */
  travauxEnCours: number;
};

export async function lireDepotDetaille(
  inputId: string,
  userId: string,
): Promise<DepotDetaille | null> {
  const depot = await prisma.input.findFirst({
    where: { id: inputId, userId },
    select: {
      id: true,
      rawContent: true,
      extractedText: true,
      status: true,
      failureReason: true,
      createdAt: true,
      atoms: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          concept: true,
          tags: true,
          uncertain: true,
          state: true,
          variants: {
            where: { retiredAt: null },
            orderBy: { createdAt: "asc" },
            select: { id: true, format: true, facet: true, question: true, answerKey: true },
          },
        },
      },
      _count: { select: { jobs: { where: { status: { in: ["QUEUED", "RUNNING"] } } } } },
    },
  });

  if (!depot) return null;

  return {
    ...depot,
    concepts: depot.atoms.map(({ variants, ...atome }) => ({ ...atome, questions: variants })),
    travauxEnCours: depot._count.jobs,
  };
}

/** Ce qu'une réécriture remet à zéro côté planification. */
const CARTE_NEUVE = {
  state: "LEARNING",
  due: new Date(0),
  stability: 0,
  difficulty: 0,
  elapsedDays: 0,
  scheduledDays: 0,
  learningSteps: 0,
  reps: 0,
  lapses: 0,
  fsrsState: "NEW",
  lastReview: null,
} as const;

async function relancerLesQuestions(atomId: string, inputId: string): Promise<void> {
  await effacerQuestions(atomId);
  await creerJobsDeQuestions(inputId, [atomId]);
  await prisma.input.update({ where: { id: inputId }, data: { status: "PROCESSING" } });
}

/**
 * Réécrit un concept. Ses questions ne le décrivent plus : elles disparaissent
 * et repartent en écriture. Pour la mémoire, c'est un concept neuf même s'il
 * garde son identifiant — la planification recommence.
 */
export async function modifierConcept(
  atomId: string,
  userId: string,
  texte: string,
): Promise<boolean> {
  const atome = await prisma.atom.findFirst({ where: { id: atomId, userId } });

  if (!atome) return false;

  await prisma.atom.update({
    where: { id: atomId },
    data: { concept: texte, uncertain: false, ...CARTE_NEUVE, due: new Date() },
  });

  await relancerLesQuestions(atomId, atome.inputId);

  return true;
}

/** Confirme un concept douteux : il repart en écriture de questions. */
export async function confirmerConcept(atomId: string, userId: string): Promise<boolean> {
  const atome = await prisma.atom.findFirst({ where: { id: atomId, userId, uncertain: true } });

  if (!atome) return false;

  await prisma.atom.update({ where: { id: atomId }, data: { uncertain: false } });
  await relancerLesQuestions(atomId, atome.inputId);

  return true;
}

export async function supprimerConcept(atomId: string, userId: string): Promise<boolean> {
  const { count } = await prisma.atom.deleteMany({ where: { id: atomId, userId } });

  return count === 1;
}

export async function supprimerDepot(inputId: string, userId: string): Promise<boolean> {
  const { count } = await prisma.input.deleteMany({ where: { id: inputId, userId } });

  return count === 1;
}
