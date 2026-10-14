import { prisma } from "@/lib/db/client";

/**
 * La carte « tu maîtrises ça », réclamée en fin de session. Marquée en base
 * pour ne jamais revenir sur le même concept : rare, elle garde son sens.
 * L'entraînement libre n'y passe pas : bien répondre trois fois en dix minutes,
 * c'est de la mémoire de travail.
 */

/**
 * Réclame la carte pour le premier concept qui n'en a jamais eu. Une par
 * session, parce qu'on ne réclame qu'en fin de session. Jamais deux fois par
 * concept : la marque n'est posée que si elle est vide, donc deux onglets
 * simultanés n'en obtiennent qu'une.
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
