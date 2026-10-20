import { prisma } from "@/lib/db/client";

/**
 * La carte « tu maîtrises ça », une fois par concept : rare, elle garde son
 * sens. Pas en entraînement : trois bonnes réponses en dix minutes, c'est de la
 * mémoire de travail.
 */

/**
 * Une par session, réclamée à la fin. La marque ne se pose que si elle est
 * vide : deux onglets simultanés n'en obtiennent qu'une.
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
