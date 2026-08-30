import { prisma } from "@/lib/db/client";
import { marquerPretSiPlusRienEnAttente } from "@/lib/db/fin-de-depot";
import type { GenerationJob, GenerationKind, JobStatus } from "@/lib/db/types";

/**
 * Accès aux jobs de génération. Le passage en RUNNING est une prise de jeton
 * atomique : deux exécuteurs qui visent le même job, seul l'un des deux part.
 */

/** Au-delà, un job repris en boucle est déclaré en échec. */
export const MAX_ATTEMPTS = 3;

/** Un job resté RUNNING plus longtemps a vu son processus mourir. */
export const STALL_AFTER_MS = 10 * 60 * 1000;

export async function createGenerationJob(
  inputId: string,
  kind: GenerationKind,
): Promise<GenerationJob> {
  return prisma.generationJob.create({ data: { inputId, kind } });
}

/**
 * Prend le job s'il est encore à prendre : en attente, ou bloqué en cours
 * depuis plus de dix minutes. Rend `null` si quelqu'un d'autre l'a déjà pris.
 *
 * Une demande reportée est refusée jusqu'à sa date. La garde est ici et nulle
 * part ailleurs : c'est le seul passage obligé vers l'exécution, et un
 * déclenchement direct la contournerait partout où on l'aurait mise plus haut.
 */
export async function claimJob(
  jobId: string,
  now: Date = new Date(),
): Promise<GenerationJob | null> {
  const stallCutoff = new Date(now.getTime() - STALL_AFTER_MS);

  const claimed = await prisma.generationJob.updateMany({
    where: {
      id: jobId,
      attempts: { lt: MAX_ATTEMPTS },
      OR: [{ notBefore: null }, { notBefore: { lte: now } }],
      AND: [{ OR: [{ status: "QUEUED" }, { status: "RUNNING", startedAt: { lt: stallCutoff } }] }],
    },
    data: { status: "RUNNING", startedAt: now, attempts: { increment: 1 } },
  });

  if (claimed.count !== 1) return null;

  return prisma.generationJob.findUnique({ where: { id: jobId } });
}

/**
 * Rend le job à la file sans lui compter sa tentative.
 *
 * Réservé au plafond d'appels atteint. Ce n'est pas un échec : rien ne s'est
 * cassé, la journée est simplement pleine, et le même travail réussira demain
 * à l'identique. Lui compter une tentative le condamnerait au bout de trois
 * journées chargées, pour une raison qui ne le concerne pas.
 */
export async function reporterJob(jobId: string, motif: string): Promise<void> {
  await prisma.generationJob.update({
    where: { id: jobId },
    data: { status: "QUEUED", startedAt: null, attempts: { decrement: 1 }, lastError: motif },
  });
}

/**
 * Le travail rendu par un job est incomplet : il repart en file avec ce qui
 * manque.
 *
 * **C'est la faille qui laissait des concepts sans questions pour toujours.** Un
 * appel porte trois concepts ; s'il n'en rend qu'un, `rangerLesLots` écrit ce
 * qui est venu, signale les rangs manquants — et le job se terminait quand même
 * `DONE`. Les deux concepts sans questions n'étaient repris par personne : ni le
 * cron, qui ne ramasse que les jobs en file, ni l'écran, qui ne dit rien tant
 * qu'un seul concept est servable. Ils restaient invisibles et muets.
 *
 * Le job est donc rétréci à ce qui manque et rendu à la file. La reprise passe
 * par la soumission groupée, qui coûte moitié prix et peut attendre : ce n'est
 * pas une urgence, c'est une dette. La tentative reste comptée — sans quoi un
 * modèle qui rend systématiquement deux lots sur trois boucle sans fin.
 *
 * Rend `false` quand les tentatives sont épuisées : au tiers essai, on arrête et
 * l'appelant laisse le job échouer pour de bon.
 */
export async function reprendreCeQuiManque(
  jobId: string,
  atomIds: string[],
  motif: string,
): Promise<boolean> {
  const job = await prisma.generationJob.findUnique({
    where: { id: jobId },
    select: { attempts: true },
  });

  if (!job || job.attempts >= MAX_ATTEMPTS || atomIds.length === 0) return false;

  await prisma.generationJob.update({
    where: { id: jobId },
    data: { atomIds, status: "QUEUED", startedAt: null, batchId: null, lastError: motif },
  });

  return true;
}

export async function finishJob(
  jobId: string,
  status: Extract<JobStatus, "DONE" | "FAILED">,
  lastError?: string,
): Promise<void> {
  await prisma.generationJob.update({
    where: { id: jobId },
    data: { status, finishedAt: new Date(), lastError: lastError ?? null },
  });
}

/**
 * Jobs que le cron peut relancer, les plus anciens d'abord.
 *
 * **Les trois natures y sont, questions comprises.** Elles en étaient exclues
 * parce qu'un job de questions vivait dans un lot chez le fournisseur et que
 * seule la relève du lot pouvait le refermer. L'envoi groupé n'existe plus : un
 * job de questions part en appel direct comme les deux autres, et sans ce
 * filet, celui dont le déclenchement après réponse n'a pas eu lieu — processus
 * recyclé, contexte de requête perdu — restait en attente pour toujours.
 *
 * Un job repris est soit resté en file, soit en cours depuis plus longtemps
 * qu'un traitement ne dure. `notBefore` tient les régénérations différées.
 */
export async function findResumableJobs(
  limit: number,
  now: Date = new Date(),
): Promise<GenerationJob[]> {
  const stallCutoff = new Date(now.getTime() - STALL_AFTER_MS);

  return prisma.generationJob.findMany({
    where: {
      kind: { in: ["OCR", "ATOMS", "VARIANTS"] },
      attempts: { lt: MAX_ATTEMPTS },
      OR: [{ notBefore: null }, { notBefore: { lte: now } }],
      AND: [{ OR: [{ status: "QUEUED" }, { status: "RUNNING", startedAt: { lt: stallCutoff } }] }],
    },
    orderBy: { createdAt: "asc" },
    take: limit,
  });
}

/**
 * Ferme les jobs bloqués qui ont épuisé leurs tentatives. Sans ça ils
 * resteraient RUNNING pour toujours, invisibles et jamais repris.
 *
 * Un job de questions parti en lot est exclu : il vit chez le fournisseur, et
 * c'est la relève qui le termine. Un job de questions sans lot, lui, entre —
 * depuis qu'ils partent en appel direct, ils peuvent se bloquer comme les
 * autres.
 */
export async function failExhaustedJobs(now: Date = new Date()): Promise<number> {
  const stallCutoff = new Date(now.getTime() - STALL_AFTER_MS);

  const bloques = await prisma.generationJob.findMany({
    where: {
      batchId: null,
      status: "RUNNING",
      startedAt: { lt: stallCutoff },
      attempts: { gte: MAX_ATTEMPTS },
    },
    select: { id: true, inputId: true },
  });

  if (bloques.length === 0) return 0;

  await prisma.generationJob.updateMany({
    where: { id: { in: bloques.map((job) => job.id) } },
    data: {
      status: "FAILED",
      finishedAt: now,
      lastError: `Interrompu ${MAX_ATTEMPTS} fois sans jamais aboutir.`,
    },
  });

  // Ces dépôts n'attendent plus rien : sans cette clôture, ils annonceraient un
  // travail en cours indéfiniment.
  for (const inputId of new Set(bloques.map((job) => job.inputId))) {
    await marquerPretSiPlusRienEnAttente(inputId, "Ce dépôt a été interrompu trop de fois.");
  }

  return bloques.length;
}
