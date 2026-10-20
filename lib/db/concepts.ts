import { prisma } from "@/lib/db/client";
import { demanderDesQuestions } from "@/lib/db/demande-de-questions";
import { recompterLesPierres } from "@/lib/db/pierres-du-cairn";
import { retirerQuestions } from "@/lib/db/variants";
import { compterReussitesConsecutives, etatApresRevision } from "@/lib/domain/etat-maitrise";

/** Toute écriture filtre sur le propriétaire : le concept d'un autre n'est pas trouvé. */

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

/**
 * Retirer d'abord : les anciennes questions contrediraient le texte, alors
 * qu'un concept sans question, l'écran l'annonce. Avec report : refusée par le
 * plafond hebdomadaire, la demande part seule à sa date. Rend les jobs à lancer ;
 * l'appelant les déclenche, la couche données ne connaît pas l'exécuteur.
 */
async function relancerLesQuestions(atomId: string, inputId: string): Promise<string[]> {
  await retirerQuestions(atomId);

  const demande = await demanderDesQuestions({ id: atomId, inputId }, new Date(), {
    reporter: true,
  });

  await prisma.input.update({ where: { id: inputId }, data: { status: "PROCESSING" } });

  return demande.etat === "partie" ? demande.jobs : [];
}

/** `null` : pas le sien. Sinon les jobs à déclencher, vides si reportée — un succès. */
export type GesteSurConcept = string[] | null;

/**
 * Planification remise à neuf. Un concept réécrit ne redevient jamais douteux,
 * exprès : la personne a lu l'avertissement, la contredire serait trancher à sa
 * place. Pas une question de coût : l'appel des questions pourrait rejuger.
 */
export async function modifierConcept(
  atomId: string,
  userId: string,
  texte: string,
): Promise<GesteSurConcept> {
  const atome = await prisma.atom.findFirst({ where: { id: atomId, userId } });

  if (!atome) return null;

  await prisma.atom.update({
    where: { id: atomId },
    data: { concept: texte, uncertain: false, ...CARTE_NEUVE, due: new Date() },
  });

  // Consolidé puis réécrit, il repart en apprentissage : sa pierre tombe.
  await recompterLesPierres(userId);

  return relancerLesQuestions(atomId, atome.inputId);
}

export async function confirmerConcept(atomId: string, userId: string): Promise<GesteSurConcept> {
  const atome = await prisma.atom.findFirst({ where: { id: atomId, userId, uncertain: true } });

  if (!atome) return null;

  await prisma.atom.update({ where: { id: atomId }, data: { uncertain: false } });

  return relancerLesQuestions(atomId, atome.inputId);
}

/**
 * Filtre sur `archivedByUser`, pas sur `ARCHIVED` : on lit l'intention de la
 * personne, pas une étiquette qu'une règle a pu poser seule. Seule l'échéance
 * revient à maintenant ; la planification garde son histoire.
 */
export async function desarchiverConcept(
  atomId: string,
  userId: string,
  maintenant: Date = new Date(),
): Promise<boolean> {
  const atome = await prisma.atom.findFirst({
    where: { id: atomId, userId, archivedByUser: true },
    select: {
      scheduledDays: true,
      reviews: { orderBy: { reviewedAt: "desc" }, take: 10, select: { rating: true } },
    },
  });

  if (!atome) return false;

  const notes = [...atome.reviews].reverse().map((passage) => passage.rating);

  await prisma.atom.update({
    where: { id: atomId },
    data: {
      archivedAt: null,
      archivedByUser: false,
      state: etatApresRevision(atome.scheduledDays, compterReussitesConsecutives(notes), false),
      due: maintenant,
    },
  });

  // Reprend la pierre de l'archivage, sauf si l'histoire le consolide de plein droit.
  await recompterLesPierres(userId);

  return true;
}

export async function supprimerConcept(atomId: string, userId: string): Promise<boolean> {
  const { count } = await prisma.atom.deleteMany({ where: { id: atomId, userId } });

  if (count === 1) await recompterLesPierres(userId);

  return count === 1;
}
