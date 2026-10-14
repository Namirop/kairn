import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron/authorization";
import { signalerLeBattement } from "@/lib/cron/battement";
import { failExhaustedJobs, findResumableJobs } from "@/lib/db/generation-job";
import { oublierLesVisitesAbandonnees } from "@/lib/db/depot-de-visite";
import { runJob, type JobOutcome } from "@/lib/jobs/runner";

/**
 * Reprise des jobs : ferme ceux qui ont épuisé leurs tentatives (`MAX_ATTEMPTS`),
 * puis rattrape ceux restés en attente et ceux bloqués « en cours » depuis
 * `STALL_AFTER_MS`. Appelée par un déclencheur externe, authentifiée par
 * CRON_SECRET.
 */

export const dynamic = "force-dynamic";

/**
 * Soixante secondes, le plafond du palier d'hébergement gratuit : le passage
 * enchaîne des appels modèle. Sans cette déclaration, la fonction est coupée
 * bien plus tôt, au milieu d'un job, et la file ralentit sans aucune erreur.
 */
export const maxDuration = 60;

/**
 * Borne le travail d'un passage. À relever si la file prend du retard, en même
 * temps que `maxDuration` : l'une sans l'autre ne sert à rien.
 */
const JOBS_PAR_PASSAGE = 3;

/**
 * Au-delà, on ne commence plus de job : il ne finirait pas dans la minute.
 *
 * Un job prend de 8 à 43 secondes (médiane 20) : trois d'affilée débordent, et
 * un passage coupé laisse un job « en cours » qui a peut-être payé son appel
 * sans rien écrire. Vingt secondes laissent les quarante restantes au job
 * qu'on démarre, ce qui couvre le neuvième décile. Le premier part toujours.
 */
const BUDGET_DE_DEPART_MS = 20_000;

export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    // i18n-ignore — lu par le planificateur de crons, jamais par une personne.
    return NextResponse.json({ erreur: "Non autorisé." }, { status: 401 });
  }

  const abandonnes = await failExhaustedJobs();
  // Les essais que personne n'a réclamés : personne n'a accepté que leur texte
  // reste. Les cascades emportent les concepts.
  const visitesOubliees = await oublierLesVisitesAbandonnees();
  const jobs = await findResumableJobs(JOBS_PAR_PASSAGE);
  const comptes: Record<JobOutcome, number> = {
    DONE: 0,
    FAILED: 0,
    SKIPPED: 0,
    REPORTE: 0,
    REPRIS: 0,
  };

  const debut = Date.now();
  let lances = 0;

  for (const job of jobs) {
    if (lances > 0 && Date.now() - debut > BUDGET_DE_DEPART_MS) break;

    comptes[await runJob(job.id)] += 1;
    lances += 1;
  }

  await signalerLeBattement("jobs");

  return NextResponse.json({
    // Ce qui a réellement tourné ; le reste attend le passage suivant.
    repris: lances,
    trouves: jobs.length,
    termines: comptes.DONE,
    echoues: comptes.FAILED,
    ignores: comptes.SKIPPED,
    // Plafond du jour plein : revenus intacts à la file, ce n'est pas un échec.
    reportes: comptes.REPORTE,
    abandonnes,
    visitesOubliees,
  });
}
