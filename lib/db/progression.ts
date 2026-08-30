import { prisma } from "@/lib/db/client";
import { ETATS_QUI_POSENT_UNE_PIERRE } from "@/lib/domain/etat-maitrise";
import { localDay } from "@/lib/domain/local-day";
import {
  progressionPourXp,
  serieApresPassage,
  unRendezVousManque,
  xpDuPassage,
} from "@/lib/domain/progression";

/**
 * L'écriture de la progression, après un passage en session du jour.
 *
 * `UserStats` existait depuis la phase 0 sans que rien ne l'alimente. C'est ce
 * fichier, et lui seul : l'entraînement libre n'y passe pas, et le fait qu'il
 * n'ait aucune raison d'importer ce module est la garantie la plus solide qu'on
 * puisse lui donner.
 *
 * Tout se joue dans une transaction interactive parce que la série se déduit de
 * la valeur précédente : lire puis écrire hors transaction laisserait deux
 * passages simultanés poser deux fois le même jour. C'est une écriture par
 * révision sur une ligne qui n'appartient qu'à une personne — la contention est
 * celle d'un utilisateur avec lui-même.
 */

export type PassageCompte = {
  userId: string;
  /** Le passage précédent sur ce concept avait échoué. */
  ratePrecedemment: boolean;
  reussiMaintenant: boolean;
  fuseau: string;
  /**
   * L'échéance que portait le concept **avant** ce passage.
   *
   * Elle est passée par l'appelant parce qu'elle n'existe plus au moment où on
   * compte : la replanification l'a déjà déplacée dans le futur. Sans elle, un
   * concept en retard depuis trois jours et revu maintenant ferait tenir la série
   * qu'il vient précisément de casser.
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
 * Le nombre de concepts consolidés est recompté plutôt qu'incrémenté : un
 * concept peut entrer en `CONSOLIDATED` comme en sortir, et un compteur qui
 * dérive d'un seul point de vue finit toujours par mentir sur la hauteur du
 * cairn. C'est une requête de comptage par révision, sur un index existant.
 */
export async function compterLePassage(
  passage: PassageCompte,
  maintenant: Date = new Date(),
): Promise<ProgressionEcrite> {
  const jour = localDay(maintenant, passage.fuseau);
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
 * Les jours d'échéance déjà atteints : celle du concept qu'on vient de revoir, et
 * celles de ce qui reste en attente.
 *
 * Une borne large en SQL, le tri exact en mémoire : c'est le même partage que
 * partout ailleurs, parce que « quel jour est-ce chez lui » ne se compare pas
 * dans une requête. La borne haute est l'instant courant — une échéance dans le
 * futur n'a par définition manqué aucun rendez-vous.
 */
async function echeancesPassees(passage: PassageCompte, maintenant: Date): Promise<string[]> {
  const enAttente = await prisma.atom.findMany({
    where: {
      userId: passage.userId,
      uncertain: false,
      state: { not: "ARCHIVED" },
      // Les mêmes conditions que pour être servable : un concept dont toutes les
      // questions ont été retirées ne pouvait pas être révisé, donc il n'a
      // manqué aucun rendez-vous.
      variants: { some: { retiredAt: null } },
      due: { lte: maintenant },
    },
    select: { due: true },
    // De quoi couvrir tout arriéré réel : le produit plafonne les dépôts à trente
    // concepts par mois, et seule l'existence d'une échéance dans le trou compte.
    take: 500,
  });

  return [passage.echeanceAvant, ...enAttente.map((atome) => atome.due)].map((echeance) =>
    localDay(echeance, passage.fuseau),
  );
}
