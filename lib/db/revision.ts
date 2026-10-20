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

/** Écrit sur-le-champ : une session interrompue garde ses révisions faites. */

/** État et signal en regardent trois au plus ; dix bornent un concept ancien. */
const PASSAGES_RELUS = 10;

export type RevisionAEcrire = {
  userId: string;
  atomId: string;
  variantId: string;
  note: ReviewRating;
  /** De l'affichage de la question à la validation, jamais au-delà. */
  tempsMs: number;
  /** « Je maîtrise ». */
  maitrise: boolean;
};

export type ResultatRevision = {
  etat: EtatMaitrise;
  prochaineEcheance: Date;
  /** Méritée, pas réclamée : la session n'en montre qu'une, `reclamerSignalDeMaitrise` tranche. */
  signal: SignalDeMaitrise | null;
  /** Nul si la progression n'a pas pu s'écrire. */
  progression: ProgressionEcrite | null;
};

function dansTroisMois(maintenant: Date): Date {
  return new Date(maintenant.getTime() + JOURS_AVANT_ARCHIVAGE * 24 * 60 * 60 * 1000);
}

/**
 * `null` si le concept n'est pas le sien ou la question pas celle du concept :
 * l'identifiant vient du client.
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
      // Retirées comprises : retirée entre-temps, la question a bien été
      // répondue. Seules les `actives` servent la rotation.
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

  // Repoussé à trois mois sans sortir du cycle : on croit savoir, et on oublie.
  const echeance = revision.maitrise ? dansTroisMois(maintenant) : plan.carte.due;
  const intervalleJours = revision.maitrise ? JOURS_AVANT_ARCHIVAGE : plan.intervalleJours;

  // Remis en ordre chronologique avant d'ajouter le passage en cours.
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

  // Après l'écriture : le cairn se compte sur l'état qui en résulte.
  // `atome.reviews`, lu avant, finit bien sur le passage précédent.
  const progression = await compterLePassage(
    {
      userId: revision.userId,
      ratePrecedemment: passes.at(-1)?.rating === "AGAIN",
      reussiMaintenant: estReussite(revision.note),
      fuseau: await lireFuseauUtilisateur(revision.userId),
      // D'avant le passage : dit si le concept attendait depuis un jour manqué.
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
