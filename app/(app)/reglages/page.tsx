import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BoutonDeconnexion } from "@/components/compte/bouton-deconnexion";
import { Panneau } from "@/components/coquille/panneau";
import { PileDePanneaux } from "@/components/coquille/pile-de-panneaux";
import { Strates } from "@/components/coquille/strates";
import { ROUTES } from "@/lib/auth/routes";
import { estAdministrateur } from "@/lib/auth/admin";
import { getCurrentUser } from "@/lib/auth/session";
import { lireReglages } from "@/lib/db/user-settings";

export const metadata: Metadata = { title: "Réglages" };

/**
 * Une ligne de réglage : ce que c'est, et sa valeur.
 *
 * Chaque ligne est posée sur sa propre surface plutôt que séparée de la
 * suivante par un filet — c'est la même correction que partout ailleurs, à
 * l'échelle d'une liste de définitions.
 */
function Ligne({ intitule, valeur }: { intitule: string; valeur: string }) {
  return (
    <div className="gap-pas-2 px-pas-4 py-pas-3 rounded-champ bg-surface-papier flex flex-wrap items-baseline justify-between">
      <dt className="text-petit text-stone-500">{intitule}</dt>
      <dd className="text-petit font-mono tabular-nums">{valeur}</dd>
    </div>
  );
}

export default async function PageReglages() {
  const utilisateur = await getCurrentUser();

  if (!utilisateur) redirect(ROUTES.connexion);

  const reglages = await lireReglages(utilisateur.id);
  const heure = `${String(reglages.dailyReminderHour).padStart(2, "0")} h 00`;

  return (
    <PileDePanneaux sol="ombre">
      <Panneau surface="papier" mesure="colonne">
        <h1 className="text-h1-app leading-tight font-bold">Réglages</h1>
        <p className="mt-pas-2 text-petit max-w-md text-stone-500">
          Les réglages deviendront modifiables avec le moteur de révision.
        </p>
      </Panneau>

      <Strates de="papier" vers="ombre" graine="reglages-liste" />

      <Panneau surface="ombre" mesure="colonne" remplit className="md:pb-pas-16">
        <dl className="gap-pas-2 flex flex-col">
          <Ligne intitule="Adresse" valeur={utilisateur.email} />
          <Ligne intitule="Fuseau horaire" valeur={reglages.timezone} />
          <Ligne
            intitule="Rappel quotidien"
            valeur={reglages.dailyReminderEnabled ? heure : "coupé"}
          />
          <Ligne
            intitule="Alerte de streak"
            valeur={reglages.streakAlertEnabled ? "active" : "coupée"}
          />
          <Ligne intitule="Emails" valeur={reglages.emailOptOutAt ? "désinscrit" : "activés"} />
        </dl>

        <div className="gap-pas-4 mt-pas-8 flex flex-col items-start">
          <Link
            href={ROUTES.commentCaMarche}
            className="rounded-galet text-petit text-stone-300 underline-offset-4 hover:text-stone-50 hover:underline focus-visible:underline"
          >
            Comment ça marche
          </Link>

          {estAdministrateur(utilisateur.email) ? (
            <Link
              href={ROUTES.signalements}
              className="rounded-galet text-petit text-stone-300 underline-offset-4 hover:text-stone-50 hover:underline focus-visible:underline"
            >
              Signalements
            </Link>
          ) : null}
        </div>

        <div className="mt-pas-8">
          <BoutonDeconnexion />
        </div>
      </Panneau>
    </PileDePanneaux>
  );
}
