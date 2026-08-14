import { prisma } from "@/lib/db/client";

/**
 * Ce qu'une visite sans compte a produit, et ce qu'il en advient.
 *
 * Séparé du verrou : `session-anonyme.ts` décide qui a le droit de déposer,
 * ce fichier-ci s'occupe de ce qui en sort — le lire pour l'afficher, le
 * rattacher à un compte quand il y en a un, l'effacer quand il n'y en aura
 * jamais. Deux décisions différentes, et deux moments différents.
 */

/**
 * Au-delà, un dépôt anonyme que personne n'a réclamé n'intéresse plus personne.
 *
 * Assez long pour qu'on revienne le lendemain finir ce qu'on a commencé, assez
 * court pour ne pas garder indéfiniment le texte de quelqu'un qui n'a jamais
 * créé de compte — et qui n'a donc accepté aucune conservation.
 */
export const JOURS_AVANT_OUBLI = 7;

export type DepotAnonyme = {
  inputId: string;
  statut: string;
  motifDechec: string | null;
  concepts: { id: string; concept: string; tags: string[] }[];
};

/** Ce qu'une session a produit, pour l'afficher à qui vient de déposer. */
export async function lireLeDepotAnonyme(sessionId: string): Promise<DepotAnonyme | null> {
  const depot = await prisma.input.findFirst({
    where: { anonymousSessionId: sessionId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      failureReason: true,
      atoms: {
        orderBy: { createdAt: "asc" },
        select: { id: true, concept: true, tags: true },
      },
    },
  });

  if (!depot) return null;

  return {
    inputId: depot.id,
    statut: depot.status,
    motifDechec: depot.failureReason,
    concepts: depot.atoms,
  };
}

/**
 * Rattache à un compte ce qu'une session anonyme a produit.
 *
 * Tout se joue dans une transaction : un dépôt qui passerait au compte sans ses
 * concepts, ou l'inverse, laisserait quelqu'un devant une liste vide en lui
 * disant qu'elle est à lui. La session est marquée réclamée dans le même
 * mouvement, ce qui la met hors de portée du cron de nettoyage.
 *
 * Rend les identifiants des concepts repris : c'est à l'appelant de leur
 * demander des questions, parce que c'est **là** que la dépense reprend, et
 * qu'elle doit se voir dans le code qui décide.
 */
export async function rattacherAuCompte(
  sessionId: string,
  userId: string,
  maintenant: Date = new Date(),
): Promise<{ inputIds: string[]; atomIds: string[] }> {
  const session = await prisma.anonymousSession.findUnique({
    where: { id: sessionId },
    select: { claimedAt: true },
  });

  // Déjà réclamée : deux onglets, ou un rechargement. Le premier a gagné.
  if (!session || session.claimedAt !== null) return { inputIds: [], atomIds: [] };

  const depots = await prisma.input.findMany({
    where: { anonymousSessionId: sessionId },
    select: { id: true, atoms: { select: { id: true } } },
  });

  if (depots.length === 0) {
    await prisma.anonymousSession.update({
      where: { id: sessionId },
      data: { claimedAt: maintenant },
    });

    return { inputIds: [], atomIds: [] };
  }

  await prisma.$transaction([
    prisma.input.updateMany({
      where: { anonymousSessionId: sessionId },
      data: { userId, anonymousSessionId: null },
    }),
    prisma.atom.updateMany({
      where: { anonymousSessionId: sessionId },
      data: { userId, anonymousSessionId: null },
    }),
    prisma.anonymousSession.update({
      where: { id: sessionId },
      data: { claimedAt: maintenant },
    }),
  ]);

  return {
    inputIds: depots.map((depot) => depot.id),
    atomIds: depots.flatMap((depot) => depot.atoms.map((atome) => atome.id)),
  };
}

/**
 * Efface les visites que personne n'a réclamées.
 *
 * Les cascades emportent le dépôt et ses concepts. C'est une obligation autant
 * qu'un ménage : quelqu'un qui n'a jamais créé de compte n'a accepté aucune
 * conservation, et son texte n'a pas à rester.
 */
export async function oublierLesVisitesAbandonnees(maintenant: Date = new Date()): Promise<number> {
  const limite = new Date(maintenant.getTime() - JOURS_AVANT_OUBLI * 24 * 60 * 60 * 1000);

  const { count } = await prisma.anonymousSession.deleteMany({
    where: { claimedAt: null, createdAt: { lt: limite } },
  });

  return count;
}
