import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Panneau } from "@/components/coquille/panneau";
import { PileDePanneaux } from "@/components/coquille/pile-de-panneaux";
import { LigneDeSignalement } from "@/components/signalements/ligne-de-signalement";
import { ROUTES } from "@/lib/auth/routes";
import { estAdministrateur } from "@/lib/auth/admin";
import { getCurrentUser } from "@/lib/auth/session";
import { listerLesSignalements } from "@/lib/db/signalement";

export const metadata: Metadata = { title: "Signalements" };

/**
 * Ce que les gens ont signalé, en clair.
 *
 * Sans écran de lecture, les signalements ne seraient jamais lus, et la seule
 * instrumentation du produit ne servirait à rien. C'est un écran interne : pas
 * de police display, pas d'accent, pas d'élément signature — de la densité et
 * des libellés qui se scannent. Le registre change parce que le lecteur change.
 *
 * Un compte non autorisé reçoit un 404 et non un 403 : l'existence de cette
 * page n'a pas à se confirmer à qui n'y a pas droit.
 */
export default async function PageSignalements() {
  const utilisateur = await getCurrentUser();

  if (!utilisateur) redirect(ROUTES.connexion);
  if (!estAdministrateur(utilisateur.email)) notFound();

  const signalements = await listerLesSignalements();

  return (
    <PileDePanneaux sol="papier">
      <Panneau surface="papier" mesure="colonne" remplit>
        <h1 className="text-h2-app font-bold text-stone-900">Signalements</h1>
        <p className="mt-pas-2 text-petit text-stone-500">
          {signalements.length === 0
            ? "Rien pour l'instant."
            : `${signalements.length} au total, les plus récents d'abord. L'empreinte dit sous quel prompt la question a été écrite.`}
        </p>

        {signalements.length > 0 ? (
          <ul className="mt-pas-8 divide-y divide-stone-300">
            {signalements.map((signalement) => (
              <LigneDeSignalement key={signalement.id} signalement={signalement} />
            ))}
          </ul>
        ) : (
          <p className="mt-pas-8 text-corps max-w-prose text-stone-500">
            Les questions signalées pendant une session arriveront ici, avec le concept dont elles
            sont tirées et le réglage qui les a écrites.
          </p>
        )}
      </Panneau>
    </PileDePanneaux>
  );
}
