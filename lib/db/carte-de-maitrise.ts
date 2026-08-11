import { prisma } from "@/lib/db/client";

/**
 * La carte « tu maîtrises ça », réclamée en fin de session.
 *
 * Ce qui est rare fait plaisir : sans la marque en base, le même concept
 * rappellerait sa victoire à chaque série qui accélère, et la carte deviendrait
 * le bruit qu'on apprend à ignorer.
 *
 * L'entraînement libre ne passe jamais par ici — trois bonnes réponses de plus
 * en plus rapides en dix minutes, c'est de la mémoire de travail, pas de la
 * maîtrise.
 */

/**
 * Réclame la carte pour le premier concept qui n'en a jamais eu.
 *
 * Au plus une par session, jamais deux fois pour le même concept : la première
 * règle tient parce qu'on ne réclame qu'une fois, en fin de session ; la seconde
 * parce que la marque est posée en base, sous condition qu'elle soit encore
 * vide. Deux onglets qui réclameraient en même temps n'en obtiennent qu'une.
 */
export async function reclamerSignalDeMaitrise(
  userId: string,
  atomIds: string[],
  maintenant: Date = new Date(),
): Promise<{ atomId: string; concept: string } | null> {
  for (const atomId of atomIds) {
    const { count } = await prisma.atom.updateMany({
      where: { id: atomId, userId, masterySignaledAt: null },
      data: { masterySignaledAt: maintenant },
    });

    if (count === 0) continue;

    const atome = await prisma.atom.findFirst({
      where: { id: atomId, userId },
      select: { concept: true },
    });

    if (atome) return { atomId, concept: atome.concept };
  }

  return null;
}
