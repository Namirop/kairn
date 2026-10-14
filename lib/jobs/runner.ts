import { PlafondGlobalAtteintError } from "@/lib/ai/errors";
import { prendreLeJob, terminerLeJob, reporterJob } from "@/lib/db/jobs-de-generation";
import { marquerPretSiPlusRienEnAttente } from "@/lib/db/fin-de-depot";
import type { GenerationKind } from "@/lib/db/types";
import { TRAITEMENTS_PAR_NATURE } from "./traitements";
import { LotIncomplet } from "./reprise-du-lot";

/**
 * L'exécuteur : prend un job, appelle le traitement et le termine, l'erreur
 * enregistrée en cas d'échec. Pas de nouvelle tentative ; seul un job dont le
 * processus est mort en route est repris par le cron, au plus trois fois.
 *
 * Deux exceptions. Le plafond d'appels du jour est un report, pas un échec : le
 * job retourne à la file sans compter sa tentative, et le dépôt reste en cours.
 * Le lot incomplet n'est pas refermé : le traitement l'a déjà rétréci à ce qui
 * manque et rendu à la file (`DONE` laisserait des concepts sans questions,
 * `FAILED` jetterait ce qui est écrit).
 */
export type IssueDuJob = "DONE" | "FAILED" | "SKIPPED" | "REPORTE" | "REPRIS";

function decrire(erreur: unknown): string {
  if (erreur instanceof Error) return `${erreur.name} : ${erreur.message}`;
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

export async function executerLeJob(jobId: string): Promise<IssueDuJob> {
  const job = await prendreLeJob(jobId);

  if (!job) return "SKIPPED";

  /*
    Une ligne de journal par job abouti, pour lire une attente depuis les
    journaux de l'hébergeur. Recoupée avec la latence des `AiCall` du job, la
    différence est tout ce qui n'est pas le modèle. Aucun contenu déposé.
  */
  const debut = Date.now();

  try {
    await TRAITEMENTS_PAR_NATURE[job.kind](job);
    await terminerLeJob(job.id, "DONE");
    console.info(`[job] ${job.kind} ${job.id} abouti en ${Date.now() - debut} ms`);
    // Le dernier job du dépôt le referme. Après un découpage, les questions
    // sont déjà en file et le dépôt reste en cours.
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
      // Pas de clôture du dépôt : le dire en échec ferait payer une journée
      // pleine à qui n'y est pour rien.
      return "REPORTE";
    }

    console.error(`Job ${job.id} (${job.kind}) en échec — ${motif}`);
    await terminerLeJob(job.id, "FAILED", motif);
    // Sans ça, le dépôt annoncerait un travail en cours pour toujours.
    await marquerPretSiPlusRienEnAttente(job.inputId, MOTIF_PAR_ETAPE[job.kind]);
    return "FAILED";
  }
}
