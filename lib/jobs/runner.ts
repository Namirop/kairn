import { claimJob, finishJob } from "@/lib/db/generation-job";
import { marquerPretSiPlusRienEnAttente } from "@/lib/db/ingestion";
import type { GenerationKind } from "@/lib/db/types";
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

/**
 * Ce que le dépôt annonce s'il s'arrête là sans avoir rien produit. Le motif
 * dit l'étape, pas l'erreur technique : elle est au registre, pas à l'écran.
 */
const MOTIF_PAR_ETAPE: Record<GenerationKind, string> = {
  OCR: "La lecture de cette capture n'a pas abouti.",
  ATOMS: "Le découpage n'a rien donné.",
  VARIANTS: "L'écriture des questions n'a pas abouti.",
};

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
    // Sans ça, un dépôt dont l'étape a échoué annoncerait un travail en cours
    // pour toujours : plus personne ne viendrait le refermer.
    await marquerPretSiPlusRienEnAttente(job.inputId, MOTIF_PAR_ETAPE[job.kind]);
    return "FAILED";
  }
}
