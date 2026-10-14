import { NextResponse } from "next/server";
import { estUnCronAutorise } from "@/lib/cron/autorisation";
import { signalerLeBattement } from "@/lib/cron/battement";
import { envoyerLesAlertesDeStreak, envoyerLesRappels } from "@/lib/jobs/rappels";
import { relancerLesComptesVides } from "@/lib/jobs/relance-des-comptes-vides";

/**
 * Les envois du jour. Le passage doit être au moins horaire : rappel et alerte
 * de série comparent l'heure locale d'un compte à une heure de réglage, et une
 * cadence plus lâche sauterait des fuseaux entiers. Les deux sont idempotents
 * par compte, par type et par jour local.
 *
 * La relance vise les comptes qui n'ont jamais rien déposé, que les deux autres
 * n'atteignent pas faute d'échéance. Elle part une fois dans la vie d'un
 * compte, garanti par la lecture des candidats et non par le jour local.
 *
 * Les journaux ne portent que des identifiants, jamais d'adresse ni de contenu.
 */

export const dynamic = "force-dynamic";

/**
 * Un appel réseau par envoi, compte par compte. À relever quand la base
 * grossira, en même temps que la borne de `trouverLesDestinataires`.
 */
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!estUnCronAutorise(request)) {
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
