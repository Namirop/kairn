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
 * L'écriture de la progression (`UserStats`), après un passage en session du
 * jour. Seul ce fichier l'alimente ; l'entraînement libre ne l'importe pas.
 *
 * Transaction interactive : la série se déduit de la valeur précédente, et
 * lire puis écrire hors transaction laisserait deux passages simultanés compter
 * deux fois le même jour.
 */

export type PassageCompte = {
  userId: string;
  /** Le passage précédent sur ce concept avait échoué. */
  ratePrecedemment: boolean;
  reussiMaintenant: boolean;
  fuseau: string;
  /**
   * L'échéance du concept avant ce passage, fournie par l'appelant : la
   * replanification l'a déjà déplacée. Sans elle, un concept en retard revu
   * maintenant ferait tenir la série qu'il vient de casser.
   */
  echeanceAvant: Date;
};

export type ProgressionEcrite = {
  xp: number;
  niveau: number;
  /** Vrai quand ce passage vient de faire monter d'un niveau. */
  niveauFranchi: boolean;
  serie: number;
  /** Vrai quand ce passage ouvre un jour de plus dans la série. */
  serieAllongee: boolean;
  consolides: number;
};

/**
 * Compte un passage de session, et rend l'état d'après.
 *
 * Les consolidés sont recomptés plutôt qu'incrémentés : un concept peut entrer
 * dans `ETATS_QUI_POSENT_UNE_PIERRE` comme en sortir. Le comptage s'appuie sur l'index
 * `[userId, state]`.
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

/**
 * Les jours d'échéance déjà atteints : celle du concept revu, et celles de ce
 * qui reste en attente. Borne SQL large, comparaison de jour local en mémoire.
 */
async function echeancesPassees(passage: PassageCompte, maintenant: Date): Promise<string[]> {
  const enAttente = await prisma.atom.findMany({
    where: {
      userId: passage.userId,
      uncertain: false,
      state: { not: "ARCHIVED" },
      // Mêmes conditions que pour être servable : un concept sans question
      // active ne pouvait pas être révisé, il n'a manqué aucun rendez-vous.
      variants: { some: { retiredAt: null } },
      due: { lte: maintenant },
    },
    select: { due: true },
    // Couvre tout arriéré réel (`PLAFOND_PAYANT` : 500 concepts par période), et
    // seule l'existence d'une échéance dans le trou compte.
    take: 500,
  });

  return [passage.echeanceAvant, ...enAttente.map((atome) => atome.due)].map((echeance) =>
    jourLocal(echeance, passage.fuseau),
  );
}
