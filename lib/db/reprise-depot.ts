import { prisma } from "@/lib/db/client";
import { etatDuDepot, type EtatDepot } from "@/lib/domain/etat-depot";

/**
 * Ce qu'on peut faire à un dépôt déjà déposé : le relancer, ou l'effacer.
 *
 * Deux gestes pour deux intentions. Redécouper garde le texte et retente
 * l'extraction — c'est la suite naturelle d'un dépôt qu'on a vidé parce que le
 * découpage ne convenait pas. Supprimer emporte le texte et tout ce qui en
 * découle, parce qu'on ne veut plus de ça du tout.
 *
 * Toute écriture passe par l'identifiant du propriétaire : un dépôt qui n'est
 * pas à l'utilisateur n'est pas trouvé, donc pas touché.
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
 * Remet le dépôt au point de départ du découpage.
 *
 * Les concepts et les travaux passés partent : ce qui va être écrit remplace ce
 * qui restait, et laisser d'anciens jobs en base ferait clore le dépôt sur un
 * état qui n'est plus le sien. Le texte, lui, n'est jamais touché — c'est la
 * règle du produit, et c'est aussi tout l'intérêt du geste.
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
 * Efface un dépôt, et avec lui ses concepts, leurs questions et leurs passages.
 *
 * La cascade est celle du schéma. Rien n'est conservé : c'est la différence
 * avec « supprimer ce concept », qui ne touche qu'à une pierre de l'édifice.
 */
export async function supprimerDepot(inputId: string, userId: string): Promise<boolean> {
  const { count } = await prisma.input.deleteMany({ where: { id: inputId, userId } });

  return count === 1;
}
