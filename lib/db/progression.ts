import { prisma } from "@/lib/db/client";
import { ETATS_QUI_POSENT_UNE_PIERRE } from "@/lib/domain/etat-maitrise";
import { jourLocal } from "@/lib/domain/jour-local";
import {
  progressionPourXp,
  serieApresPassage,
  unRendezVousManque,
  xpDuPassage,
} from "@/lib/domain/progression";

/**
 * Seul écrivain de `UserStats` ; l'entraînement ne l'importe pas. Transaction
 * interactive : la série se déduit de la valeur précédente, et hors transaction
 * deux passages simultanés compteraient deux fois le même jour.
 */

export type PassageCompte = {
  userId: string;
  /** Le passage précédent sur ce concept a échoué. */
  ratePrecedemment: boolean;
  reussiMaintenant: boolean;
  fuseau: string;
  /**
   * Fournie par l'appelant, la replanification l'ayant déjà déplacée. Sans
   * elle, un retard revu maintenant ferait tenir la série qu'il a cassée.
   */
  echeanceAvant: Date;
};

export type ProgressionEcrite = {
  xp: number;
  niveau: number;
  niveauFranchi: boolean;
  serie: number;
  /** Ce passage ouvre un jour de plus dans la série. */
  serieAllongee: boolean;
  consolides: number;
};

/**
 * Consolidés recomptés, pas incrémentés : un concept peut entrer dans
 * `ETATS_QUI_POSENT_UNE_PIERRE` comme en sortir. Index `[userId, state]`.
 */
export async function compterLePassage(
  passage: PassageCompte,
  maintenant: Date = new Date(),
): Promise<ProgressionEcrite> {
  const jour = jourLocal(maintenant, passage.fuseau);
  const gain = xpDuPassage(passage.ratePrecedemment, passage.reussiMaintenant);

  const [consolides, echeances] = await Promise.all([
    prisma.atom.count({
      where: { userId: passage.userId, state: { in: ETATS_QUI_POSENT_UNE_PIERRE } },
    }),
    echeancesPassees(passage, maintenant),
  ]);

  return prisma.$transaction(async (tx) => {
    const avant = await tx.userStats.findUnique({
      where: { userId: passage.userId },
      select: { xp: true, currentStreak: true, longestStreak: true, lastReviewedOn: true },
    });

    const dernierJour = avant?.lastReviewedOn
      ? avant.lastReviewedOn.toISOString().slice(0, 10)
      : null;
    const xp = (avant?.xp ?? 0) + gain;
    const serie = serieApresPassage(
      dernierJour,
      jour,
      avant?.currentStreak ?? 0,
      dernierJour === null ? false : unRendezVousManque(echeances, dernierJour, jour),
    );
    const niveau = progressionPourXp(xp).niveau;

    await tx.userStats.upsert({
      where: { userId: passage.userId },
      create: {
        userId: passage.userId,
        xp,
        level: niveau,
        currentStreak: serie,
        longestStreak: serie,
        lastReviewedOn: new Date(`${jour}T00:00:00.000Z`),
        atomsConsolidated: consolides,
      },
      update: {
        xp,
        level: niveau,
        currentStreak: serie,
        longestStreak: Math.max(avant?.longestStreak ?? 0, serie),
        lastReviewedOn: new Date(`${jour}T00:00:00.000Z`),
        atomsConsolidated: consolides,
      },
    });

    return {
      xp,
      niveau,
      niveauFranchi: niveau > progressionPourXp(avant?.xp ?? 0).niveau,
      serie,
      serieAllongee: dernierJour !== jour,
      consolides,
    };
  });
}

/** Celle du concept revu et celles en attente. Borne SQL large, jour local en mémoire. */
async function echeancesPassees(passage: PassageCompte, maintenant: Date): Promise<string[]> {
  const enAttente = await prisma.atom.findMany({
    where: {
      userId: passage.userId,
      uncertain: false,
      state: { not: "ARCHIVED" },
      // Comme pour être servable : sans question active, aucun rendez-vous manqué.
      variants: { some: { retiredAt: null } },
      due: { lte: maintenant },
    },
    select: { due: true },
    // = `PLAFOND_PAYANT`, tout arriéré réel ; seule compte une échéance dans le trou.
    take: 500,
  });

  return [passage.echeanceAvant, ...enAttente.map((atome) => atome.due)].map((echeance) =>
    jourLocal(echeance, passage.fuseau),
  );
}
