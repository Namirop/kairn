import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron/authorization";
import { findAlreadyNotified, findReminderCandidates } from "@/lib/db/reminder-audience";
import { selectDueForReminder } from "@/lib/domain/reminder-selection";

/**
 * Rappel quotidien, passage horaire.
 *
 * En phase 0 la route calcule la sélection et la journalise — elle n'envoie
 * rien. Brancher l'envoi consistera à appeler `sendNotification()` sur chaque
 * ligne retenue, une fois que le nombre d'Atoms dus sera calculable.
 *
 * Les journaux ne portent que des identifiants, jamais d'adresse ni de contenu.
 */

export const dynamic = "force-dynamic";

/**
 * Le passage est court aujourd'hui — il sélectionne et journalise. Il enverra
 * un email par compte retenu le jour où l'envoi sera branché, et c'est cette
 * boucle-là qui a besoin de durer.
 */
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ erreur: "Non autorisé." }, { status: 401 });
  }

  const now = new Date();
  const candidats = await findReminderCandidates();
  const alHeure = selectDueForReminder(candidats, now);

  const dejaNotifies = await findAlreadyNotified(
    "DAILY_REMINDER",
    alHeure.map((entry) => ({ userId: entry.target.userId, day: entry.day })),
  );

  const aNotifier = alHeure.filter((entry) => !dejaNotifies.has(entry.target.userId));

  console.info(
    `Rappel quotidien — ${candidats.length} candidats, ${alHeure.length} à l'heure, ` +
      `${dejaNotifies.size} déjà notifiés, ${aNotifier.length} à envoyer.`,
  );

  for (const entry of aNotifier) {
    console.info(`  à envoyer : ${entry.target.userId} (${entry.day})`);
  }

  return NextResponse.json({
    candidats: candidats.length,
    alHeure: alHeure.length,
    dejaNotifies: dejaNotifies.size,
    aEnvoyer: aNotifier.length,
    envoyes: 0,
  });
}
