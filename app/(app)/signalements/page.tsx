import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { BlocComptes } from "@/components/administration/bloc-comptes";
import { BlocDepense } from "@/components/administration/bloc-depense";
import { BlocVolumes } from "@/components/administration/bloc-volumes";
import { Section } from "@/components/administration/section";
import { Panneau } from "@/components/coquille/panneau";
import { PileDePanneaux } from "@/components/coquille/pile-de-panneaux";
import { LigneDeSignalement } from "@/components/signalements/ligne-de-signalement";
import { ROUTES } from "@/lib/auth/routes";
import { estAdministrateur } from "@/lib/auth/admin";
import { getCurrentUser } from "@/lib/auth/session";
import { lireLAdministration } from "@/lib/db/administration";
import { listerLesSignalements } from "@/lib/db/signalement";

export const metadata: Metadata = { title: "Administration" };

/**
 * L'écran interne : ce que le produit coûte, ce qu'il sert, ce qu'on lui
 * reproche.
 *
 * Quatre mesures en lecture seule, sans graphique et sans filtre. Un graphique
 * demande à être interprété ; ces chiffres-là doivent se lire d'un coup d'œil et
 * répondre à une question qu'on se pose déjà — combien ça coûte aujourd'hui, est-ce
 * que les gens reviennent, est-ce que le découpage rend ce qu'il devrait.
 *
 * Le registre est l'inverse de celui du produit : pas de police display, pas
 * d'accent, pas d'élément signature — de la densité et des libellés qui se
 * scannent. Le lecteur change, donc le registre change.
 *
 * Un compte non autorisé reçoit un 404 et non un 403 : l'existence de cette page
 * n'a pas à se confirmer à qui n'y a pas droit.
 */
export const dynamic = "force-dynamic";

export default async function PageAdministration() {
  const utilisateur = await getCurrentUser();

  if (!utilisateur) redirect(ROUTES.connexion);
  if (!estAdministrateur(utilisateur.email)) notFound();

  const [chiffres, signalements] = await Promise.all([
    lireLAdministration(),
    listerLesSignalements(),
  ]);

  return (
    <PileDePanneaux sol="papier">
      <Panneau surface="papier" mesure="page" remplit>
        <h1 className="text-h2-app font-bold text-stone-900">Administration</h1>
        <p className="mt-pas-2 text-petit max-w-prose text-stone-500">
          Lecture seule. Les fenêtres et les journées sont en UTC, comme les compteurs qu&apos;elles
          résument.
        </p>

        <div className="mt-pas-12">
          <BlocComptes chiffres={chiffres.comptes} />
          <BlocDepense chiffres={chiffres.depense} />
          <BlocVolumes jours={chiffres.volumes} />

          <Section
            intitule="Signalements"
            contexte={
              signalements.length === 0
                ? "Rien pour l'instant."
                : "Les plus récents d'abord. L'empreinte dit sous quel prompt la question a été écrite."
            }
          >
            {signalements.length === 0 ? (
              <p className="text-petit max-w-prose text-stone-500">
                Les questions signalées pendant une session arriveront ici, avec le concept dont
                elles sont tirées et le réglage qui les a écrites.
              </p>
            ) : (
              <ul className="divide-y divide-stone-300">
                {signalements.map((signalement) => (
                  <LigneDeSignalement key={signalement.id} signalement={signalement} />
                ))}
              </ul>
            )}
          </Section>
        </div>
      </Panneau>
    </PileDePanneaux>
  );
}
