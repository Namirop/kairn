import { prisma } from "@/lib/db/client";
import { runJob } from "@/lib/jobs/runner";

/**
 * De quoi rejouer un dépôt hors requête HTTP.
 *
 * `after()` ne part pas en dehors d'une requête : les jobs restent en attente,
 * exactement comme quand un processus est recyclé. On les exécute donc à la
 * main, ce qui vérifie au passage que le cron de reprise a de quoi travailler.
 */

export const UTILISATEUR_DE_TEST = "verification-ingestion@cairn.test";

export function formulaire(champs: Record<string, string>, image?: File): FormData {
  const donnees = new FormData();

  for (const [nom, valeur] of Object.entries(champs)) donnees.set(nom, valeur);
  if (image) donnees.set("image", image);

  return donnees;
}

export async function utilisateurDeTest(): Promise<string> {
  const existant = await prisma.user.findFirst({ where: { email: UTILISATEUR_DE_TEST } });

  if (existant) return existant.id;

  const cree = await prisma.user.create({
    data: {
      // C'est better-auth qui pose l'identifiant en temps normal ; ici, une
      // valeur fixe suffit et rend le nettoyage évident.
      id: "verification-ingestion",
      email: UTILISATEUR_DE_TEST,
      name: "Vérification",
      emailVerified: true,
      settings: { create: { timezone: "UTC" } },
    },
  });

  return cree.id;
}

/**
 * Exécute les jobs en attente de ce dépôt, sauf les questions.
 *
 * Sert les cas qui éprouvent le chemin groupé : ils veulent des jobs de
 * questions laissés en file, à soumettre en lot.
 */
export async function executerJobsEnAttente(inputId: string): Promise<number> {
  const jobs = await prisma.generationJob.findMany({
    where: { inputId, status: "QUEUED", kind: { in: ["OCR", "ATOMS"] } },
    orderBy: { createdAt: "asc" },
  });

  for (const job of jobs) await runJob(job.id);

  return jobs.length;
}

/**
 * Exécute tout ce qui attend, questions comprises — ce que fait `declencher()`
 * derrière une vraie requête. Hors requête, `after()` ne part pas.
 */
export async function executerToutLePipeline(inputId: string): Promise<number> {
  let executes = 0;

  // Le découpage crée les jobs de questions : il faut donc repasser après lui.
  for (let passage = 0; passage < 3; passage += 1) {
    const jobs = await prisma.generationJob.findMany({
      where: { inputId, status: "QUEUED" },
      orderBy: { createdAt: "asc" },
    });

    if (jobs.length === 0) break;

    for (const job of jobs) await runJob(job.id);

    executes += jobs.length;
  }

  return executes;
}

/**
 * Recule la fenêtre de débit, pour éprouver le quota du jour sans attendre une
 * minute entre deux dépôts.
 *
 * La fenêtre ne se lit plus sur les dépôts écrits : elle vit sur la ligne de
 * `DailyUsage`, parce qu'un compteur lu à part laissait passer tout ce qui
 * partait ensemble. C'est donc cette ligne qu'on vieillit. Les horodatages des
 * dépôts suivent, pour que le décor reste cohérent avec ce qu'on raconte.
 */
export async function vieillirLesDepots(userId: string): Promise<void> {
  const passe = new Date(Date.now() - 10 * 60 * 1000);

  await prisma.input.updateMany({ where: { userId }, data: { createdAt: passe } });
  await prisma.dailyUsage.updateMany({
    where: { userId },
    data: { depositWindowStart: passe, actionWindowStart: passe },
  });
}

/**
 * Rend une place libre sans rien effacer : les limites sont éprouvées à part,
 * elles n'ont pas à gêner la vérification du pipeline.
 */
export async function libererLaJournee(userId: string): Promise<void> {
  await vieillirLesDepots(userId);
  await prisma.dailyUsage.deleteMany({ where: { userId } });
}

/** Remet le compte du jour et les dépôts à zéro entre deux vérifications. */
export async function repartirDeZero(userId: string): Promise<void> {
  await prisma.input.deleteMany({ where: { userId } });
  await prisma.dailyUsage.deleteMany({ where: { userId } });
  await prisma.waitlistEntry.deleteMany({ where: { userId } });
  await prisma.aiBatch.deleteMany({ where: { jobs: { none: {} } } });
}

export async function compterQuestions(inputId: string): Promise<number> {
  return prisma.variant.count({ where: { atom: { inputId } } });
}
