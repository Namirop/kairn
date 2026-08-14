import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron/authorization";
import { failExhaustedJobs, findResumableJobs } from "@/lib/db/generation-job";
import { oublierLesVisitesAbandonnees } from "@/lib/db/depot-de-visite";
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
 * Soixante secondes, parce que c'est le plafond du palier d'hébergement gratuit.
 * Sans cette déclaration, la fonction est coupée bien plus tôt encore, au milieu
 * d'un job. Rien n'est perdu — le travail redevient reprenable au passage
 * suivant — mais la file n'avancerait que d'un job ou deux par passage sans
 * qu'aucune erreur ne le dise. C'est le pire genre de panne : celle qui
 * ressemble à de la lenteur. À monter le jour où l'hébergement le permet.
 */
export const maxDuration = 60;

/**
 * Borne le travail d'un passage : le reste attendra le passage suivant.
 *
 * Les jobs tournent en série et chacun peut porter un appel modèle de dix à
 * trente secondes : trois est ce qui rentre dans la minute accordée, avec de la
 * marge pour un appel lent. À un passage toutes les dix minutes, la file absorbe
 * dix-huit jobs à l'heure — au-delà de ce qu'un compte peut produire en une
 * journée, puisque son plafond mensuel est de trente concepts.
 *
 * C'est la valeur à relever d'abord si la file prend du retard, en même temps
 * que `maxDuration` : les deux vont ensemble et l'une sans l'autre ne sert rien.
 */
const BATCH_SIZE = 3;

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
