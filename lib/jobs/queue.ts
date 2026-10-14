import { after } from "next/server";
import { createGenerationJob } from "@/lib/db/generation-job";
import type { GenerationJob, GenerationKind } from "@/lib/db/types";
import { runJob } from "./runner";

/**
 * Mise en file d'un travail : on écrit le job, on rend la main, et `after()`
 * lance le traitement une fois la réponse envoyée. Si le traitement ne part pas
 * (hors requête, processus recyclé), le cron de reprise récupère le job.
 */
export async function enqueueJob(inputId: string, kind: GenerationKind): Promise<GenerationJob> {
  const job = await createGenerationJob(inputId, kind);

  declencher(job.id);

  return job;
}

/**
 * Lance un job déjà écrit, derrière la réponse. Séparé de la création parce
 * que `creerJobsDeQuestions` écrit les jobs en groupe.
 */
export function declencher(jobId: string): void {
  try {
    after(async () => {
      await runJob(jobId);
    });
  } catch (error) {
    console.error(`Job ${jobId} créé mais non déclenché ; le cron le reprendra.`, error);
  }
}
