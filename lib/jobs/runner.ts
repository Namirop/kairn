import { claimJob, finishJob } from "@/lib/db/generation-job";
import { JOB_HANDLERS } from "./handlers";

/**
 * L'exécuteur. Il prend un job, le passe en cours, appelle le traitement et le
 * termine — terminé ou en échec, l'erreur enregistrée.
 *
 * Un traitement qui lève marque le job en échec, sans nouvelle tentative : un
 * échec est un échec. Seul un job dont le processus est mort en route reste
 * repris par le cron, et au plus trois fois.
 */
export type JobOutcome = "DONE" | "FAILED" | "SKIPPED";

function describe(error: unknown): string {
  if (error instanceof Error) return `${error.name} : ${error.message}`;
  return "Erreur inconnue.";
}

export async function runJob(jobId: string): Promise<JobOutcome> {
  const job = await claimJob(jobId);

  if (!job) return "SKIPPED";

  try {
    await JOB_HANDLERS[job.kind](job);
    await finishJob(job.id, "DONE");
    return "DONE";
  } catch (error) {
    const reason = describe(error);
    console.error(`Job ${job.id} (${job.kind}) en échec — ${reason}`);
    await finishJob(job.id, "FAILED", reason);
    return "FAILED";
  }
}
