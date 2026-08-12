import { AIQuotaError } from "@/lib/ai/errors";
import { claimJob, finishJob, reporterJob } from "@/lib/db/generation-job";
import { marquerPretSiPlusRienEnAttente } from "@/lib/db/fin-de-depot";
import type { GenerationKind } from "@/lib/db/types";
import { JOB_HANDLERS } from "./handlers";

/**
 * L'exécuteur. Il prend un job, le passe en cours, appelle le traitement et le
 * termine — terminé ou en échec, l'erreur enregistrée.
 *
 * Un traitement qui lève marque le job en échec, sans nouvelle tentative : un
 * échec est un échec. Seul un job dont le processus est mort en route reste
 * repris par le cron, et au plus trois fois.
 *
 * Une exception, et une seule : le plafond d'appels du jour. Ce n'est pas un
 * échec, c'est un report — rien ne s'est cassé, la journée est pleine, et le
 * même travail réussira demain. Le job retourne à la file sans compter sa
 * tentative, et le dépôt continue d'annoncer un travail en cours plutôt que de
 * dire à quelqu'un que son dépôt est perdu parce que son voisin a été rapide.
 */
export type JobOutcome = "DONE" | "FAILED" | "SKIPPED" | "REPORTE";

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
    // Un job qui aboutit peut être le dernier du dépôt : c'est lui qui le
    // referme. Le découpage, lui, vient de mettre les questions en file — le
    // compte des jobs restants le voit, et le dépôt reste en cours.
    await marquerPretSiPlusRienEnAttente(job.inputId);
    return "DONE";
  } catch (error) {
    const reason = describe(error);

    if (error instanceof AIQuotaError) {
      console.warn(`Job ${job.id} (${job.kind}) reporté — ${reason}`);
      await reporterJob(job.id, reason);
      // Aucune clôture du dépôt : il attend toujours quelque chose, et c'est
      // vrai. Le dire en échec serait facturer une journée pleine à qui n'y est
      // pour rien.
      return "REPORTE";
    }

    console.error(`Job ${job.id} (${job.kind}) en échec — ${reason}`);
    await finishJob(job.id, "FAILED", reason);
    // Sans ça, un dépôt dont l'étape a échoué annoncerait un travail en cours
    // pour toujours : plus personne ne viendrait le refermer.
    await marquerPretSiPlusRienEnAttente(job.inputId, MOTIF_PAR_ETAPE[job.kind]);
    return "FAILED";
  }
}
