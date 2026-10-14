import { prisma } from "@/lib/db/client";
import { planifier } from "@/lib/db/planification";
import { compterLePassage, type ProgressionEcrite } from "@/lib/db/progression";
import { regenererSiUsees } from "@/lib/db/regeneration";
import { lireFuseauUtilisateur } from "@/lib/db/reglages-du-compte";
import type { ReviewRating } from "@/lib/db/types";
import {
  compterReussitesConsecutives,
  estReussite,
  etatApresRevision,
  JOURS_AVANT_ARCHIVAGE,
  type EtatMaitrise,
} from "@/lib/domain/etat-maitrise";
import { apresLePassage } from "@/lib/domain/rotation-variantes";
import { signalDeMaitrise, type SignalDeMaitrise } from "@/lib/domain/signal-maitrise";

/**
 * Un passage sur une question, écrit immédiatement : une session interrompue
 * garde les révisions déjà faites, rien n'attend la fin pour être validé.
 */

/**
 * Passages relus pour juger l'état et le signal. Les deux en regardent trois au
 * plus ; dix suffisent et bornent la lecture d'un concept révisé depuis des mois.
 */
const PASSAGES_RELUS = 10;

export type RevisionAEcrire = {
  userId: string;
  atomId: string;
  variantId: string;
  note: ReviewRating;
  /** De l'affichage de la question à la validation, jamais au-delà. */
  tempsMs: number;
  /** L'utilisateur a déclaré maîtriser le concept. */
  maitrise: boolean;
};

export type ResultatRevision = {
  etat: EtatMaitrise;
  prochaineEcheance: Date;
  /**
   * Le concept vient-il de mériter sa carte ? Elle n'est pas encore réclamée :
   * la session n'en montre qu'une, c'est `reclamerSignalDeMaitrise` qui tranche.
   */
  signal: SignalDeMaitrise | null;
  /** Ce que ce passage a rapporté. Nul si la progression n'a pas pu s'écrire. */
  progression: ProgressionEcrite | null;
};

function dansTroisMois(maintenant: Date): Date {
  return new Date(maintenant.getTime() + JOURS_AVANT_ARCHIVAGE * 24 * 60 * 60 * 1000);
}

/**
 * Écrit le passage et replanifie le concept.
 *
 * Rend `null` quand le concept n'est pas celui de cet utilisateur, ou quand la
 * question ne porte pas sur ce concept : l'identifiant vient du client, il n'est
 * jamais cru sur parole.
 */
export async function enregistrerRevision(
  revision: RevisionAEcrire,
  maintenant: Date = new Date(),
): Promise<ResultatRevision | null> {
  const atome = await prisma.atom.findFirst({
    where: { id: revision.atomId, userId: revision.userId },
    select: {
      id: true,
      inputId: true,
      due: true,
      stability: true,
      difficulty: true,
      elapsedDays: true,
      scheduledDays: true,
      learningSteps: true,
      reps: true,
      lapses: true,
      fsrsState: true,
      lastReview: true,
      masterySignaledAt: true,
      // Les variantes retirées entrent aussi : une question affichée a pu être
      // retirée entre-temps (concept réécrit, questions renouvelées), et la
      // réponse reste un fait réel. Seules les `actives` servent la rotation.
      variants: {
        select: {
          id: true,
          facet: true,
          retiredAt: true,
          sessionCount: true,
          trainingCount: true,
          lastSessionAt: true,
        },
      },
      reviews: {
        orderBy: { reviewedAt: "desc" },
        take: PASSAGES_RELUS,
        select: { rating: true, responseTimeMs: true },
      },
    },
  });

  if (!atome) return null;

  const variante = atome.variants.find((candidate) => candidate.id === revision.variantId);

  if (!variante) return null;

  const actives = atome.variants.filter((candidate) => candidate.retiredAt === null);

  const plan = planifier(atome, revision.note, maintenant);

  // « Je maîtrise » repousse l'échéance à trois mois sans sortir le concept :
  // la thèse du produit est qu'on croit savoir et qu'on oublie.
  const echeance = revision.maitrise ? dansTroisMois(maintenant) : plan.carte.due;
  const intervalleJours = revision.maitrise ? JOURS_AVANT_ARCHIVAGE : plan.intervalleJours;

  // Lus du plus récent au plus ancien : remis dans l'ordre chronologique avant
  // d'y ajouter le passage en cours.
  const passes = [...atome.reviews].reverse();
  const notes = [...passes.map((passe) => passe.rating), revision.note];
  const chronometres = [
    ...passes.map((passe) => ({
      reussi: estReussite(passe.rating),
      tempsMs: passe.responseTimeMs,
    })),
    { reussi: estReussite(revision.note), tempsMs: revision.tempsMs },
  ];

  const etat = etatApresRevision(
    intervalleJours,
    compterReussitesConsecutives(notes),
    revision.maitrise,
  );

  await prisma.$transaction([
    prisma.review.create({
      data: {
        atomId: atome.id,
        variantId: variante.id,
        userId: revision.userId,
        rating: revision.note,
        responseTimeMs: revision.tempsMs,
        mode: "SESSION",
        selfMastered: revision.maitrise,
        stabilityBefore: plan.stabiliteAvant,
        stabilityAfter: plan.stabiliteApres,
        reviewedAt: maintenant,
      },
    }),
    prisma.variant.update({
      where: { id: variante.id },
      data: { sessionCount: { increment: 1 }, lastSessionAt: maintenant },
    }),
    prisma.atom.update({
      where: { id: atome.id },
      data: {
        ...plan.carte,
        due: echeance,
        state: etat,
        ...(revision.maitrise ? { archivedAt: maintenant, archivedByUser: true } : {}),
      },
    }),
  ]);

  await regenererSiUsees(atome, apresLePassage(actives, variante.id, "SESSION"), maintenant);

  // Après l'écriture : la hauteur du cairn se compte sur l'état qui en résulte.
  // `atome.reviews` a été lu avant l'écriture, son dernier est bien le passage
  // précédent.
  const progression = await compterLePassage(
    {
      userId: revision.userId,
      ratePrecedemment: passes.at(-1)?.rating === "AGAIN",
      reussiMaintenant: estReussite(revision.note),
      fuseau: await lireFuseauUtilisateur(revision.userId),
      // Celle d'avant le passage : elle dit si ce concept attendait depuis un
      // jour où personne n'est venu.
      echeanceAvant: atome.due,
    },
    maintenant,
  );

  return {
    etat,
    prochaineEcheance: echeance,
    signal: atome.masterySignaledAt ? null : signalDeMaitrise(chronometres),
    progression,
  };
}
