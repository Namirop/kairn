import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron/authorization";
import { signalerLeBattement } from "@/lib/cron/battement";
import { envoyerLesAlertesDeStreak, envoyerLesRappels } from "@/lib/jobs/rappels";
import { relancerLesComptesVides } from "@/lib/jobs/relance-des-comptes-vides";

/**
 * Les envois du jour, passage horaire.
 *
 * Deux envois dans le même passage, et la cadence horaire est ce qui les rend
 * possibles tous les deux : chacun compare l'heure **locale** d'un compte à une
 * heure de réglage, et une cadence plus lâche sauterait des fuseaux entiers.
 *
 * Le rappel part à l'heure choisie, quand il y a quelque chose à revoir.
 * L'alerte de série part le soir, et seulement si une série est en train d'être
 * perdue. Les deux sont idempotents par compte, par type et par jour local.
 *
 * La relance, elle, vise les comptes qui n'ont jamais rien déposé — les seuls
 * que les deux premiers n'atteignent jamais, faute d'échéance. Elle part une
 * fois dans la vie d'un compte, et c'est la lecture des candidats qui le
 * garantit, pas le jour local.
 *
 * Les journaux ne portent que des identifiants, jamais d'adresse ni de contenu.
 */

export const dynamic = "force-dynamic";

/**
 * Le passage écrit à des comptes, un par un, avec un appel réseau par envoi. La
 * minute accordée par le palier gratuit tient largement à l'échelle actuelle ;
 * c'est la valeur à relever quand la base grossira, en même temps que la borne
 * de `findReminderCandidates`.
 */
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    // i18n-ignore — lu par le planificateur de crons, jamais par une personne.
    return NextResponse.json({ erreur: "Non autorisé." }, { status: 401 });
  }

  const maintenant = new Date();
  const rappels = await envoyerLesRappels(maintenant);
  const alertes = await envoyerLesAlertesDeStreak(maintenant);
  const relances = await relancerLesComptesVides(maintenant);

  await signalerLeBattement("rappels");

  return NextResponse.json({ rappels, alertes, relances });
}
