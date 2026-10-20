import { NextResponse } from "next/server";
import { estUnCronAutorise } from "@/lib/cron/autorisation";
import { signalerLeBattement } from "@/lib/cron/battement";
import { fermerLesJobsEpuises, trouverLesJobsAReprendre } from "@/lib/db/jobs-de-generation";
import { oublierLesVisitesAbandonnees } from "@/lib/db/depot-de-visite";
import { oublierLesEnvoisDeCodeClos } from "@/lib/db/envois-de-code";
import { executerLeJob, type IssueDuJob } from "@/lib/jobs/runner";

/**
 * Ferme les jobs épuisés, puis rattrape ceux en attente ou bloqués « en cours ».
 * Déclencheur externe, authentifié par CRON_SECRET.
 */

export const dynamic = "force-dynamic";

/**
 * Plafond du palier gratuit. Sans cette déclaration, la fonction est coupée bien
 * plus tôt, au milieu d'un job, et la file ralentit sans erreur.
 */
export const maxDuration = 60;

/** À relever avec `maxDuration` si la file prend du retard : l'un sans l'autre ne sert à rien. */
const JOBS_PAR_PASSAGE = 3;

/**
 * Au-delà, on ne commence plus de job. Un job prend 8 à 43 s (médiane 20), et un
 * passage coupé laisse un job « en cours » qui a peut-être payé son appel sans
 * rien écrire : 40 s restantes couvrent le neuvième décile. Le premier part toujours.
 */
const BUDGET_DE_DEPART_MS = 20_000;

export async function GET(request: Request) {
  if (!estUnCronAutorise(request)) {
    // i18n-ignore — lu par le planificateur de crons, jamais par une personne.
    return NextResponse.json({ erreur: "Non autorisé." }, { status: 401 });
  }

  const abandonnes = await fermerLesJobsEpuises();
  // Essais non réclamés : personne n'a accepté que leur texte reste. Les cascades
  // emportent les concepts.
  const visitesOubliees = await oublierLesVisitesAbandonnees();
  await oublierLesEnvoisDeCodeClos();
  const jobs = await trouverLesJobsAReprendre(JOBS_PAR_PASSAGE);
  const comptes: Record<IssueDuJob, number> = {
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

    comptes[await executerLeJob(job.id)] += 1;
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
    // Plafond du jour plein : rendus intacts à la file, pas un échec.
    reportes: comptes.REPORTE,
    abandonnes,
    visitesOubliees,
  });
}
