import { prisma } from "@/lib/db/client";
import { demanderDesQuestions } from "@/lib/db/demande-de-questions";
import { retirerQuestions } from "@/lib/db/variants";
import { compterReussitesConsecutives, etatApresRevision } from "@/lib/domain/etat-maitrise";

/**
 * Lecture et correction d'un concept.
 *
 * Toute écriture passe par l'identifiant du propriétaire : un concept qui n'est
 * pas à l'utilisateur n'est pas trouvé, donc pas touché. Le `userId` ne vient
 * jamais du client.
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
 * Les questions de ce concept ne le décrivent plus : elles sortent, et on en
 * redemande.
 *
 * Les deux gestes sont indissociables et dans cet ordre. Garder les anciennes
 * en attendant les neuves servirait des questions qui contredisent le texte —
 * c'est le seul des trois résultats possibles qui soit malhonnête. Un concept
 * momentanément sans question ne l'est pas : l'écran dit qu'elles arrivent.
 *
 * La demande passe par le point de passage unique, comme le seuil d'usure : si
 * le plafond hebdomadaire la refuse, elle est écrite avec sa date et part toute
 * seule ce jour-là. Elle n'est jamais jetée.
 *
 * Rend les jobs à lancer tout de suite, jamais vide sauf report. Corriger un
 * concept est un geste où l'on attend un résultat : ses questions partent en
 * appel direct, comme celles d'un dépôt, et non par le chemin groupé qui coûte
 * moitié prix mais rend le lendemain. C'est l'appelant qui les déclenche — la
 * couche données n'a pas à connaître l'exécuteur.
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
 * Ce qu'un geste sur un concept rend à son appelant.
 *
 * `null` quand le concept n'est pas le sien : il n'est pas trouvé, donc pas
 * touché. Sinon, les jobs à déclencher — vides quand la demande a été reportée,
 * ce qui reste un succès du point de vue du geste.
 */
export type GesteSurConcept = string[] | null;

/**
 * Réécrit un concept. Ses questions ne le décrivent plus : elles sortent du
 * tirage et repartent en écriture. Pour la mémoire, c'est un concept neuf même
 * s'il garde son identifiant — la planification recommence.
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
 * Remet dans le cycle un concept que l'utilisateur en avait sorti.
 *
 * « Je maîtrise ça » est une déclaration, pas une suppression, et une
 * déclaration se retire. Sans ce chemin, un clic sortait un concept pour six
 * mois sans aucun retour possible — une perte de données déguisée en geste
 * réversible.
 *
 * `archivedByUser` est redondant avec l'état depuis que le produit n'archive
 * plus rien de lui-même — mais c'est le champ le plus étroit, et une ligne
 * écrite sous l'ancienne règle qu'une migration aurait ratée porterait encore
 * `ARCHIVED` sans que personne ne l'ait demandé. On lit l'intention, pas
 * l'étiquette.
 *
 * La planification ne repart pas de zéro — le concept a une histoire et elle
 * reste vraie. Seule l'échéance revient à maintenant : qui remet un concept en
 * révision veut le revoir, pas attendre.
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

  return true;
}

export async function supprimerConcept(atomId: string, userId: string): Promise<boolean> {
  const { count } = await prisma.atom.deleteMany({ where: { id: atomId, userId } });

  return count === 1;
}
