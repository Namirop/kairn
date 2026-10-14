import { prisma } from "@/lib/db/client";
import { demanderDesQuestions } from "@/lib/db/demande-de-questions";
import { recompterLesPierres } from "@/lib/db/pierres-du-cairn";
import { retirerQuestions } from "@/lib/db/variants";
import { compterReussitesConsecutives, etatApresRevision } from "@/lib/domain/etat-maitrise";

/**
 * Correction d'un concept. Toute écriture filtre sur le propriétaire : un
 * concept qui n'est pas à l'utilisateur n'est pas trouvé, donc pas touché.
 */

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
 * Retire les questions du concept, puis en redemande — dans cet ordre : garder
 * les anciennes en attendant servirait des questions qui contredisent le texte.
 * Un concept momentanément sans question, lui, l'écran l'annonce.
 *
 * La demande passe par `demanderDesQuestions` avec report : refusée par le
 * plafond hebdomadaire, elle part seule à sa date, jamais jetée.
 *
 * Rend les jobs à lancer tout de suite (vide en cas de report) ; c'est
 * l'appelant qui les déclenche, la couche données ne connaît pas l'exécuteur.
 */
async function relancerLesQuestions(atomId: string, inputId: string): Promise<string[]> {
  await retirerQuestions(atomId);

  const demande = await demanderDesQuestions({ id: atomId, inputId }, new Date(), {
    reporter: true,
  });

  await prisma.input.update({ where: { id: inputId }, data: { status: "PROCESSING" } });

  return demande.etat === "partie" ? demande.jobs : [];
}

/**
 * `null` quand le concept n'est pas le sien ; sinon les jobs à déclencher, vides
 * quand la demande a été reportée — ce qui reste un succès.
 */
export type GesteSurConcept = string[] | null;

/**
 * Réécrit un concept : ses questions repartent en écriture, et sa planification
 * recommence comme pour un concept neuf.
 *
 * Un concept réécrit ne redevient jamais douteux, et c'est voulu : le texte ne
 * repasse pas par le modèle. La personne a lu l'avertissement et réécrit en
 * connaissance de cause ; la contredire une seconde fois serait trancher à sa
 * place. Le coût n'est pas la raison — rejuger le texte pourrait se faire dans
 * l'appel qui écrit déjà les questions.
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

  // Un concept consolidé qu'on réécrit repart en apprentissage : sa pierre tombe.
  await recompterLesPierres(userId);

  return relancerLesQuestions(atomId, atome.inputId);
}

/** Confirme un concept douteux : il repart en écriture de questions. */
export async function confirmerConcept(atomId: string, userId: string): Promise<GesteSurConcept> {
  const atome = await prisma.atom.findFirst({ where: { id: atomId, userId, uncertain: true } });

  if (!atome) return null;

  await prisma.atom.update({ where: { id: atomId }, data: { uncertain: false } });

  return relancerLesQuestions(atomId, atome.inputId);
}

/**
 * Remet dans le cycle un concept que l'utilisateur avait déclaré maîtrisé.
 *
 * Le filtre porte sur `archivedByUser` et non sur l'état `ARCHIVED` : c'est
 * l'intention de la personne qu'on lit, pas une étiquette qu'une ancienne règle
 * a pu poser seule.
 *
 * La planification garde son histoire ; seule l'échéance revient à maintenant.
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

  // L'archivage déclaré posait une pierre ; la remise en révision la reprend,
  // sauf si l'histoire du concept le rend consolidé de plein droit.
  await recompterLesPierres(userId);

  return true;
}

export async function supprimerConcept(atomId: string, userId: string): Promise<boolean> {
  const { count } = await prisma.atom.deleteMany({ where: { id: atomId, userId } });

  if (count === 1) await recompterLesPierres(userId);

  return count === 1;
}
