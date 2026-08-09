import { after } from "next/server";
import { createGenerationJob } from "@/lib/db/generation-job";
import type { GenerationJob, GenerationKind } from "@/lib/db/types";
import { runJob } from "./runner";

/**
 * Mise en file d'un travail. L'utilisateur n'attend jamais un appel modèle dans
 * sa requête : on écrit le job, on rend la main, et `after()` lance le
 * traitement une fois la réponse envoyée.
 *
 * Si le traitement ne part pas — hors contexte de requête, processus recyclé —
 * le job reste simplement en attente et le cron de reprise le récupère.
 */
export async function enqueueJob(inputId: string, kind: GenerationKind): Promise<GenerationJob> {
  const job = await createGenerationJob(inputId, kind);

  try {
    after(async () => {
      await runJob(job.id);
    });
  } catch (error) {
    console.error(`Job ${job.id} créé mais non déclenché ; le cron le reprendra.`, error);
  }

  return job;
}
