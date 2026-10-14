import { prisma } from "@/lib/db/client";
import { etatDuDepot, type EtatDepot } from "@/lib/domain/etat-depot";

/**
 * Ce qu'on peut faire à un dépôt existant : le redécouper (le texte reste, les
 * concepts sont refaits) ou l'effacer. Toute écriture filtre par propriétaire.
 */

export type DepotAReprendre = {
  id: string;
  etat: EtatDepot;
  /** Faux quand il ne reste rien à redécouper : une capture jamais lue. */
  aDuTexte: boolean;
};

export async function lireDepotAReprendre(
  inputId: string,
  userId: string,
): Promise<DepotAReprendre | null> {
  const depot = await prisma.input.findFirst({
    where: { id: inputId, userId },
    select: {
      id: true,
      rawContent: true,
      extractedText: true,
      status: true,
      jobs: { where: { status: { in: ["QUEUED", "RUNNING"] } }, select: { kind: true } },
      _count: { select: { atoms: true } },
    },
  });

  if (!depot) return null;

  return {
    id: depot.id,
    etat: etatDuDepot({
      status: depot.status,
      travaux: depot.jobs,
      concepts: depot._count.atoms,
    }),
    aDuTexte: (depot.extractedText ?? depot.rawContent).trim().length > 0,
  };
}

/**
 * Remet le dépôt au point de départ du découpage. Les anciens jobs partent avec
 * les concepts : laissés en base, ils feraient clore le dépôt sur un état qui
 * n'est plus le sien. Le texte n'est jamais touché.
 */
export async function repartirEnDecoupage(inputId: string, userId: string): Promise<boolean> {
  const depot = await prisma.input.findFirst({
    where: { id: inputId, userId },
    select: { id: true },
  });

  if (!depot) return false;

  await prisma.$transaction([
    prisma.atom.deleteMany({ where: { inputId, userId } }),
    prisma.generationJob.deleteMany({ where: { inputId } }),
    prisma.input.update({
      where: { id: inputId },
      data: { status: "PROCESSING", failureReason: null },
    }),
  ]);

  return true;
}

/**
 * Efface un dépôt, et par la cascade du schéma ses concepts, leurs questions
 * et leurs passages.
 */
export async function supprimerDepot(inputId: string, userId: string): Promise<boolean> {
  const { count } = await prisma.input.deleteMany({ where: { id: inputId, userId } });

  return count === 1;
}
