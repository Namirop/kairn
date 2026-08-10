import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron/authorization";
import { releverLots, soumettreLotsEnAttente } from "@/lib/jobs/questions";

/**
 * Les envois groupés : ce qui part, et ce qui revient.
 *
 * Un passage relève d'abord les lots terminés, puis soumet les jobs de
 * questions restés en attente — filet pour ceux que l'ingestion n'a pas réussi
 * à soumettre dans la foulée, et pour ceux que la relève vient de rendre à la
 * file. Un lot resté sans réponse au bout d'un jour est signalé et ses jobs
 * rendus à la file, jamais relancé en boucle.
 *
 * Appelée par un déclencheur externe, authentifiée par CRON_SECRET.
 */

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ erreur: "Non autorisé." }, { status: 401 });
  }

  const releves = await releverLots();
  const soumises = await soumettreLotsEnAttente();

  return NextResponse.json({ releves, soumises });
}
