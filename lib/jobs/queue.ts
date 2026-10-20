import { after } from "next/server";
import { creerJobDeGeneration } from "@/lib/db/jobs-de-generation";
import type { GenerationJob, GenerationKind } from "@/lib/db/types";
import { executerLeJob } from "./runner";

/** Traité après la réponse ; s'il ne part pas (processus recyclé), le cron le reprend. */
export async function mettreEnFile(inputId: string, kind: GenerationKind): Promise<GenerationJob> {
  const job = await creerJobDeGeneration(inputId, kind);

  declencher(job.id);

  return job;
}

/** Séparé de la création : `creerJobsDeQuestions` écrit les jobs en groupe. */
export function declencher(jobId: string): void {
  try {
    after(async () => {
      await executerLeJob(jobId);
    });
  } catch (erreur) {
    console.error(`Job ${jobId} créé mais non déclenché ; le cron le reprendra.`, erreur);
  }
}
