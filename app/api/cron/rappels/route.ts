import { NextResponse } from "next/server";
import { estUnCronAutorise } from "@/lib/cron/autorisation";
import { signalerLeBattement } from "@/lib/cron/battement";
import { envoyerLesAlertesDeStreak, envoyerLesRappels } from "@/lib/jobs/rappels";
import { relancerLesComptesVides } from "@/lib/jobs/relance-des-comptes-vides";

/**
 * Passage au moins horaire : rappel et alerte comparent l'heure locale à une
 * heure de réglage, une cadence plus lâche sauterait des fuseaux. Idempotents
 * par compte, type et jour local. La relance (comptes sans dépôt) part une fois
 * dans la vie d'un compte, garanti par la lecture des candidats.
 * Journaux : des identifiants seulement.
 */

export const dynamic = "force-dynamic";

/** Un appel réseau par envoi : à relever avec la borne de `trouverLesDestinataires`. */
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
