import { prisma } from "@/lib/db/client";
import type { InputSourceType } from "@/lib/db/types";
import { apercuDeProse } from "@/lib/domain/apercu-de-prose";
import { etatDuDepot, type EtatDepot } from "@/lib/domain/etat-depot";

/** Ce que l'utilisateur a déposé, du plus récent au plus ancien. */

const APERCU = 220;

export type DepotListe = {
  id: string;
  apercu: string;
  sourceType: InputSourceType;
  etat: EtatDepot;
  /** Le motif d'un rejet ou d'une panne, tel qu'il a été écrit. */
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
    // Une capture n'a souvent pas de texte déposé : c'est ce qu'on y a lu qui
    // la décrit, et rien tant qu'elle n'est pas lue.
    //
    // Mis à plat, parce qu'une ligne de liste ne peut pas porter une structure :
    // l'écran du dépôt lit ses titres et ses tableaux, ici on n'a que les mots.
    // Voir `apercuDeProse`.
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

/**
 * Combien de dépôts ce compte a écrits.
 *
 * Sert à reconnaître le premier : c'est le seul moment où l'écran de dépôt doit
 * dire ce qu'on attend de lui, et le seul où les exemples servent à quelque
 * chose. Après, ils encombreraient le geste qu'ils étaient censés déclencher.
 */
export async function compterLesDepots(userId: string): Promise<number> {
  return prisma.input.count({ where: { userId } });
}
