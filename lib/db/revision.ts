import { prisma } from "@/lib/db/client";
import { planifier } from "@/lib/db/planification";
import { regenererSiUsees } from "@/lib/db/regeneration";
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
 * Un passage sur une question, écrit immédiatement.
 *
 * Une session interrompue à la troisième question sur dix garde ses trois
 * révisions : rien n'est mis de côté pour être validé à la fin. Personne ne perd
 * son travail parce qu'il a fermé un onglet.
 */

/**
 * Passages relus pour juger l'état et le signal.
 *
 * Le signal en regarde trois, la consolidation s'arrête au premier échec en
 * remontant et se compare à trois : dix suffisent largement aux deux, et
 * bornent la lecture d'un concept révisé depuis des mois.
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
      variants: {
        where: { retiredAt: null },
        select: {
          id: true,
          facet: true,
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

  const plan = planifier(atome, revision.note, maintenant);

  // L'archivage déclaré ne supprime rien : il repousse l'échéance à trois mois.
  // La thèse du produit est qu'on croit savoir et qu'on oublie — prendre la
  // déclaration au pied de la lettre reviendrait à contredire le produit.
  const echeance = revision.maitrise ? dansTroisMois(maintenant) : plan.carte.due;
  const intervalleJours = revision.maitrise ? JOURS_AVANT_ARCHIVAGE : plan.intervalleJours;

  // Les passages arrivent du plus récent au plus ancien : on les remet dans le
  // sens de l'histoire avant d'y ajouter celui qu'on est en train d'écrire.
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

  await regenererSiUsees(atome, apresLePassage(atome.variants, variante.id, "SESSION"), maintenant);

  return {
    etat,
    prochaineEcheance: echeance,
    signal: atome.masterySignaledAt ? null : signalDeMaitrise(chronometres),
  };
}
