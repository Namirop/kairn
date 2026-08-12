import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron/authorization";
import { failExhaustedJobs, findResumableJobs } from "@/lib/db/generation-job";
import { runJob, type JobOutcome } from "@/lib/jobs/runner";

/**
 * Reprise des jobs. Rattrape ceux restés en attente et ceux dont le processus
 * est mort en cours de route depuis plus de dix minutes, puis ferme ceux qui
 * ont épuisé leurs trois tentatives.
 *
 * Appelée par un déclencheur externe, authentifiée par CRON_SECRET.
 */

export const dynamic = "force-dynamic";

/** Borne le travail d'un passage : le reste attendra le passage suivant. */
const BATCH_SIZE = 20;

export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ erreur: "Non autorisé." }, { status: 401 });
  }

  const abandonnes = await failExhaustedJobs();
  const jobs = await findResumableJobs(BATCH_SIZE);
  const comptes: Record<JobOutcome, number> = { DONE: 0, FAILED: 0, SKIPPED: 0, REPORTE: 0 };

  for (const job of jobs) {
    comptes[await runJob(job.id)] += 1;
  }

  return NextResponse.json({
    repris: jobs.length,
    termines: comptes.DONE,
    echoues: comptes.FAILED,
    ignores: comptes.SKIPPED,
    // Le plafond du jour était plein : ces jobs sont revenus à la file intacts,
    // ils repartiront au prochain passage. Ce n'est pas une ligne d'échec.
    reportes: comptes.REPORTE,
    abandonnes,
  });
}
