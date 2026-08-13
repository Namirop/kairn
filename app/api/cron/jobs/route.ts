import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron/authorization";
import { failExhaustedJobs, findResumableJobs } from "@/lib/db/generation-job";
import { oublierLesVisitesAbandonnees } from "@/lib/db/session-anonyme";
import { runJob, type JobOutcome } from "@/lib/jobs/runner";

/**
 * Reprise des jobs. Rattrape ceux restés en attente et ceux dont le processus
 * est mort en cours de route depuis plus de dix minutes, puis ferme ceux qui
 * ont épuisé leurs trois tentatives.
 *
 * Appelée par un déclencheur externe, authentifiée par CRON_SECRET.
 */

export const dynamic = "force-dynamic";

/**
 * Le passage a le droit de durer : il enchaîne des appels modèle.
 *
 * Sans ce plafond, la fonction est coupée à la durée par défaut de
 * l'hébergeur — quelques dizaines de secondes — au milieu d'un job. Le travail
 * en cours redevient reprenable au passage suivant, donc rien n'est perdu, mais
 * la file n'avancerait jamais que d'un ou deux jobs par passage sans qu'aucune
 * erreur ne le dise.
 */
export const maxDuration = 300;

/**
 * Borne le travail d'un passage : le reste attendra le passage suivant.
 *
 * Dix et non vingt. Les jobs tournent en série et chacun peut porter un appel
 * modèle de dix à trente secondes : vingt ne tenaient pas dans les cinq minutes
 * accordées. À dix par passage et un passage toutes les dix minutes, la file
 * absorbe soixante jobs à l'heure — très au-delà de ce que les plafonds
 * journaliers autorisent à produire.
 */
const BATCH_SIZE = 10;

export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ erreur: "Non autorisé." }, { status: 401 });
  }

  const abandonnes = await failExhaustedJobs();
  // Les essais que personne n'a réclamés : leur texte n'a pas à rester, et
  // personne n'a accepté qu'il reste. Les cascades emportent concepts compris.
  const visitesOubliees = await oublierLesVisitesAbandonnees();
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
    visitesOubliees,
  });
}
