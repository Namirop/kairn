import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BoutonDeconnexion } from "@/components/compte/bouton-deconnexion";
import { ROUTES } from "@/lib/auth/routes";
import { getCurrentUser } from "@/lib/auth/session";
import { findUserSettings } from "@/lib/db/user-settings";

export const metadata: Metadata = { title: "Réglages" };

/** Une ligne de réglage : ce que c'est, et sa valeur. */
function Ligne({ intitule, valeur }: { intitule: string; valeur: string }) {
  return (
    <div className="gap-pas-2 py-pas-4 flex flex-wrap items-baseline justify-between border-b border-stone-100 last:border-b-0">
      <dt className="text-petit text-stone-500">{intitule}</dt>
      <dd className="text-petit font-mono tabular-nums">{valeur}</dd>
    </div>
  );
}

export default async function PageReglages() {
  const utilisateur = await getCurrentUser();

  if (!utilisateur) redirect(ROUTES.connexion);

  const reglages = await findUserSettings(utilisateur.id);
  const heure = `${String(reglages?.dailyReminderHour ?? 19).padStart(2, "0")} h 00`;

  return (
    <div className="gap-pas-8 flex max-w-xl flex-col">
      <div>
        <h1 className="text-h1-app leading-tight font-bold">Réglages</h1>
        <p className="mt-pas-2 text-petit text-stone-500">
          Les réglages deviendront modifiables avec le moteur de révision.
        </p>
      </div>

      <dl>
        <Ligne intitule="Adresse" valeur={utilisateur.email} />
        <Ligne intitule="Fuseau horaire" valeur={reglages?.timezone ?? "UTC"} />
        <Ligne
          intitule="Rappel quotidien"
          valeur={reglages?.dailyReminderEnabled ? heure : "coupé"}
        />
        <Ligne
          intitule="Alerte de streak"
          valeur={reglages?.streakAlertEnabled ? "active" : "coupée"}
        />
        <Ligne intitule="Emails" valeur={reglages?.emailOptOutAt ? "désinscrit" : "activés"} />
      </dl>

      <BoutonDeconnexion />
    </div>
  );
}
