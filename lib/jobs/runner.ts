import { PlafondGlobalAtteintError } from "@/lib/ai/errors";
import { prendreLeJob, terminerLeJob, reporterJob } from "@/lib/db/jobs-de-generation";
import { marquerPretSiPlusRienEnAttente } from "@/lib/db/fin-de-depot";
import type { GenerationKind } from "@/lib/db/types";
import { TRAITEMENTS_PAR_NATURE } from "./traitements";
import { LotIncomplet } from "./reprise-du-lot";

/**
 * Pas de nouvelle tentative : seul un job mort en route est repris par le cron,
 * trois fois au plus. Deux exceptions : le plafond du jour reporte sans compter
 * la tentative ; un lot incomplet, déjà rétréci et rendu à la file, n'est pas
 * refermé (`DONE` laisserait des concepts sans questions, `FAILED` jetterait
 * l'écrit).
 */
export type IssueDuJob = "DONE" | "FAILED" | "SKIPPED" | "REPORTE" | "REPRIS";

function decrire(erreur: unknown): string {
  if (erreur instanceof Error) return `${erreur.name} : ${erreur.message}`;
  return "Erreur inconnue.";
}

/** L'étape, pas l'erreur technique : elle est au registre, pas à l'écran. */
const MOTIF_PAR_ETAPE: Record<GenerationKind, string> = {
  OCR: "La lecture de cette capture n'a pas abouti.",
  ATOMS: "Le découpage n'a rien donné.",
  VARIANTS: "L'écriture des questions n'a pas abouti.",
};

export async function executerLeJob(jobId: string): Promise<IssueDuJob> {
  const job = await prendreLeJob(jobId);

  if (!job) return "SKIPPED";

  // Recoupée avec la latence des `AiCall`, la différence est ce qui n'est pas le modèle.

  const debut = Date.now();

  try {
    await TRAITEMENTS_PAR_NATURE[job.kind](job);
    await terminerLeJob(job.id, "DONE");
    console.info(`[job] ${job.kind} ${job.id} abouti en ${Date.now() - debut} ms`);
    // Après un découpage, les questions sont déjà en file : le dépôt reste ouvert.
    await marquerPretSiPlusRienEnAttente(job.inputId);
    return "DONE";
  } catch (erreur) {
    const motif = decrire(erreur);

    if (erreur instanceof LotIncomplet) {
      console.warn(`Job ${job.id} (${job.kind}) repris — ${motif}`);
      // Pas de clôture du dépôt : la reprise est en file.
      return "REPRIS";
    }

    if (erreur instanceof PlafondGlobalAtteintError) {
      console.warn(`Job ${job.id} (${job.kind}) reporté — ${motif}`);
      await reporterJob(job.id, motif);
      // Le dire en échec ferait payer une journée pleine à qui n'y est pour rien.
      return "REPORTE";
    }

    console.error(`Job ${job.id} (${job.kind}) en échec — ${motif}`);
    await terminerLeJob(job.id, "FAILED", motif);
    // Sinon le dépôt resterait en cours pour toujours.
    await marquerPretSiPlusRienEnAttente(job.inputId, MOTIF_PAR_ETAPE[job.kind]);
    return "FAILED";
  }
}
