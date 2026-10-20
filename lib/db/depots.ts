import { prisma } from "@/lib/db/client";
import type { InputSourceType } from "@/lib/db/types";
import { apercuDeProse } from "@/lib/domain/apercu-de-prose";
import { etatDuDepot, type EtatDepot } from "@/lib/domain/etat-depot";

const APERCU = 220;

export type DepotListe = {
  id: string;
  apercu: string;
  sourceType: InputSourceType;
  etat: EtatDepot;
  /** D'un rejet ou d'une panne, tel qu'écrit. */
  motif: string | null;
  createdAt: Date;
  nombreAtoms: number;
};

export async function listerDepots(userId: string, limite = 50): Promise<DepotListe[]> {
  const lignes = await prisma.input.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limite,
    select: {
      id: true,
      rawContent: true,
      extractedText: true,
      sourceType: true,
      status: true,
      failureReason: true,
      createdAt: true,
      jobs: {
        where: { status: { in: ["QUEUED", "RUNNING"] } },
        select: { kind: true },
      },
      _count: { select: { atoms: true } },
    },
  });

  return lignes.map((ligne) => ({
    id: ligne.id,
    // Une capture se décrit souvent par ce qu'on y a lu. Mis à plat : une ligne
    // de liste ne porte pas de structure.
    apercu: apercuDeProse(ligne.rawContent.trim() || ligne.extractedText || "", APERCU),
    sourceType: ligne.sourceType,
    etat: etatDuDepot({
      status: ligne.status,
      travaux: ligne.jobs,
      concepts: ligne._count.atoms,
    }),
    motif: ligne.failureReason,
    createdAt: ligne.createdAt,
    nombreAtoms: ligne._count.atoms,
  }));
}

export async function compterLesDepots(userId: string): Promise<number> {
  return prisma.input.count({ where: { userId } });
}
